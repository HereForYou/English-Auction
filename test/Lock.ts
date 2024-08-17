// SPDX-License-Identifier: MIT

import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";
import { Signer } from "ethers";

describe("Lock", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOneYearLockFixture() {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const ONE_GWEI = 1_000_000_000;

    const lockedAmount = ONE_GWEI;
    const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await hre.ethers.getSigners();

    const Lock = await hre.ethers.getContractFactory("Lock");
    const lock = await Lock.deploy(unlockTime, { value: lockedAmount });

    const Simple = await hre.ethers.getContractFactory("SimpleStorage");
    const simple = await Simple.deploy();

    return { lock, unlockTime, lockedAmount, owner, otherAccount, simple };
  }

  describe("Deployment", function () {
    it("Simple", async function () {
      const { simple } = await loadFixture(deployOneYearLockFixture);
      expect(await simple.storedData()).to.equal("123");
    });

    it("Should set the right unlockTime", async function () {
      const { lock, unlockTime } = await loadFixture(deployOneYearLockFixture);

      expect(await lock.unlockTime()).to.equal(unlockTime);
    });

    it("Should set the right owner", async function () {
      const { lock, owner } = await loadFixture(deployOneYearLockFixture);

      expect(await lock.owner()).to.equal(owner.address);
    });

    it("Should receive and store the funds to lock", async function () {
      const { lock, lockedAmount } = await loadFixture(
        deployOneYearLockFixture
      );

      expect(await hre.ethers.provider.getBalance(lock.target)).to.equal(
        lockedAmount
      );
    });

    it("Should fail if the unlockTime is not in the future", async function () {
      // We don't use the fixture here because we want a different deployment
      const latestTime = await time.latest();
      const Lock = await hre.ethers.getContractFactory("Lock");
      await expect(Lock.deploy(latestTime, { value: 1 })).to.be.revertedWith(
        "Unlock time should be in the future"
      );
    });
  });

  describe("Withdrawals", function () {
    describe("Validations", function () {
      it("Should revert with the right error if called too soon", async function () {
        const { lock } = await loadFixture(deployOneYearLockFixture);

        await expect(lock.withdraw()).to.be.revertedWith(
          "You can't withdraw yet"
        );
      });

      it("Should revert with the right error if called from another account", async function () {
        const { lock, unlockTime, otherAccount } = await loadFixture(
          deployOneYearLockFixture
        );

        // We can increase the time in Hardhat Network
        await time.increaseTo(unlockTime);

        // We use lock.connect() to send a transaction from another account
        await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
          "You aren't the owner"
        );
      });

      it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
        const { lock, unlockTime } = await loadFixture(
          deployOneYearLockFixture
        );

        // Transactions are sent using the first signer by default
        await time.increaseTo(unlockTime);

        await expect(lock.withdraw()).not.to.be.reverted;
      });
    });

    describe("Events", function () {
      it("Should emit an event on withdrawals", async function () {
        const { lock, unlockTime, lockedAmount } = await loadFixture(
          deployOneYearLockFixture
        );

        await time.increaseTo(unlockTime);

        await expect(lock.withdraw())
          .to.emit(lock, "Withdrawal")
          .withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
      });
    });

    describe("Transfers", function () {
      it("Should transfer the funds to the owner", async function () {
        const { lock, unlockTime, lockedAmount, owner } = await loadFixture(
          deployOneYearLockFixture
        );

        await time.increaseTo(unlockTime);

        await expect(lock.withdraw()).to.changeEtherBalances(
          [owner, lock],
          [lockedAmount, -lockedAmount]
        );
      });
    });
  });
});

//==================================================== EnglishAuction.test.ts ====================================================

let EnglishAuction: any;
let auction: any;
let NFT: any;
let nft: any;
let seller: Signer;
let bidder1: Signer;
let bidder2: Signer;
const startBid = ethers.parseEther("1.0"); // 1 Ether

describe("EnglishAuction", function () {
  beforeEach(async function () {
    [seller, bidder1, bidder2] = await ethers.getSigners();

    // Deploy a mock ERC721 NFT contract
    NFT = await ethers.getContractFactory("MockNFT");
    nft = await NFT.deploy();
    // await nft.deployed();

    // Mint an NFT to the seller
    await nft.mint(await seller.getAddress(), 1);

    // Deploy the EnglishAuction contract
    EnglishAuction = await ethers.getContractFactory("EnglishAuction");
    auction = await EnglishAuction.deploy(nft.getAddress(), 1, startBid);
    // await auction.deployed();
  });

  it("should start the auction", async function () {
    // await nft.connect(seller).approve(auction.address, 1);
    expect(await auction.started()).to.be.false;
    await auction.connect(seller).start();

    expect(await auction.started()).to.be.true;
    expect(await auction.endAt()).to.be.greaterThan(0);
  });

  it("should allow bidding", async function () {
    // await nft.connect(seller).approve(auction.address, 1);
    await auction.connect(seller).start();

    await auction.connect(bidder1).bid({ value: ethers.parseEther("1.5") });
    expect(await auction.highestBidder()).to.equal(await bidder1.getAddress());
    expect(await auction.highestBid()).to.equal(ethers.parseEther("1.5"));

    await auction.connect(bidder2).bid({ value: ethers.parseEther("2.0") });
    expect(await auction.highestBidder()).to.equal(await bidder2.getAddress());
    expect(await auction.highestBid()).to.equal(ethers.parseEther("2.0"));
  });

  it("should allow withdrawing bids", async function () {
    // await nft.connect(seller).approve(auction.address, 1);
    await auction.connect(seller).start();

    await auction.connect(bidder1).bid({ value: ethers.parseEther("1.5") });
    await auction.connect(bidder2).bid({ value: ethers.parseEther("2.0") });

    const initialBidder1Balance = await ethers.provider.getBalance(
      await bidder1.getAddress()
    );
    await auction.connect(bidder1).withdraw();
    const finalBidder1Balance = await ethers.provider.getBalance(
      await bidder1.getAddress()
    );

    expect(finalBidder1Balance).to.be.gt(initialBidder1Balance); // Check if balance increased
  });

  it("should end the auction and transfer the NFT", async function () {
    // await nft.connect(seller).approve(auction.address, 1);
    await auction.connect(seller).start();

    await auction.connect(bidder1).bid({ value: ethers.parseEther("2.0") });
    await auction.connect(bidder2).bid({ value: ethers.parseEther("2.5") });

    // Fast forward time to end the auction
    await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
    await ethers.provider.send("evm_mine");

    await auction.connect(seller).end();

    expect(await nft.ownerOf(1)).to.equal(await bidder2.getAddress());
  });
});

//=========================================== EtherWallet.test.ts ===========================================

describe("EtherWallet", () => {
  let owner: any;
  let other: any;
  let EtherWallet: any;
  let etherWallet: any;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();

    EtherWallet = await ethers.getContractFactory("EtherWallet");
    etherWallet = await EtherWallet.deploy();
  });

  it("should start with correct parameters", async function () {
    expect(await etherWallet.owner()).to.equal(await owner.getAddress());
  });

  it("Should accept funds", async function () {
    const sendValue = ethers.parseEther("1.4");

    await owner.sendTransaction({
      to: await etherWallet.getAddress(),
      value: sendValue,
    });

    const balance = await etherWallet.getBalance();
    expect(balance).to.equal(sendValue);
  });

  it("should not allow to withdraw if not owner", async function () {
    const sendValue = ethers.parseEther("1.0");

    await owner.sendTransaction({
      to: await etherWallet.getAddress(),
      value: sendValue,
    });

    const withdrawAmount = ethers.parseEther("0.5");
    // await etherWallet.connect(await owner.getAddress()).withdraw({value: 2})
    await expect(
      etherWallet.connect(other).withdraw(withdrawAmount)
    ).to.be.revertedWith("Only owner can withdraw.");
  });
});

//============================================================ Dutch Auction ============================================================

describe("DutchAuction", function () {
  let DutchAuction: any;
  let auction: any;
  let NFT: any;
  let nft: any;
  let seller: Signer;
  let buyer1: Signer;
  let buyer2: Signer;
  const startingPrice = ethers.parseEther("100"); // 10 Ether
  const discountRate = ethers.parseEther("0.0001"); // 1 Ether per second

  beforeEach(async function () {
    [seller, buyer1, buyer2] = await ethers.getSigners();

    // Deploy a mock ERC721 NFT contract
    NFT = await ethers.getContractFactory("MockNFT");
    nft = await NFT.deploy();

    // Mint an NFT to the seller
    await nft.mint(await seller.getAddress(), 1);

    // Deploy the DutchAuction contract
    DutchAuction = await ethers.getContractFactory("DutchAuction");
    auction = await DutchAuction.deploy(
      startingPrice,
      discountRate,
      nft.getAddress(),
      1
    );
  });

  it("should start with the correct parameters", async function () {
    expect(await auction.startingPrice()).to.equal(startingPrice);
    expect(await auction.discountRate()).to.equal(discountRate);
    expect(await auction.seller()).to.equal(await seller.getAddress());
  });

  it("should calculate the correct price over time", async function () {
    await ethers.provider.send("evm_increaseTime", [1]); // Increase time by 1 second
    await ethers.provider.send("evm_mine"); // Mine a new block

    const priceAfterOneSecond = await auction.getPrice();
    expect(priceAfterOneSecond).to.equal(startingPrice - discountRate);

    await ethers.provider.send("evm_increaseTime", [5]); // Increase time by 5 seconds
    await ethers.provider.send("evm_mine"); // Mine a new block

    const priceAfterSixSeconds = await auction.getPrice();
    expect(priceAfterSixSeconds).to.equal(
      startingPrice - discountRate * BigInt(6)
    );
  });

  it("should allow a buyer to purchase the NFT", async function () {
    await ethers.provider.send("evm_increaseTime", [1]); // Increase time by 1 second
    await ethers.provider.send("evm_mine"); // Mine a new block

    const price = await auction.getPrice();
    await auction.connect(buyer1).buy({ value: price });

    expect(await nft.ownerOf(1)).to.equal(await buyer1.getAddress());
  });

  it("should refund excess Ether after purchase", async function () {
    await ethers.provider.send("evm_increaseTime", [1]); // Increase time by 1 second
    await ethers.provider.send("evm_mine"); // Mine a new block

    const price = await auction.getPrice();
    const initialBalance = await ethers.provider.getBalance(
      await buyer1.getAddress()
    );

    const tx = await auction
      .connect(buyer1)
      .buy({ value: price + ethers.parseEther("1") });
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed * receipt.gasPrice;

    const finalBalance = await ethers.provider.getBalance(
      await buyer1.getAddress()
    );
    expect(finalBalance).to.be.equal(
      initialBalance - price - BigInt(gasUsed) + ethers.parseEther("0.0001")
    );
  });

  it("should not allow purchase after the auction ends", async function () {
    await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]); // Increase time by 7 days + 1 second
    await ethers.provider.send("evm_mine"); // Mine a new block

    await expect(
      auction.connect(buyer1).buy({ value: ethers.parseEther("1") })
    ).to.be.revertedWith("Auction has been ended.");
  });

  it("should not allow purchase if not enough Ether is sent", async function () {
    await ethers.provider.send("evm_increaseTime", [1]); // Increase time by 1 second
    await ethers.provider.send("evm_mine"); // Mine a new block

    const price = await auction.getPrice();
    await expect(
      auction.connect(buyer1).buy({ value: price - BigInt(500000000000000) })
    ).to.be.revertedWith("cost < price");
  });
});

//======================================================== Multi Sig Wallet Test ========================================================

describe("MultiSigWallet", function () {
  let multiSigWallet: any;
  let owner1: any;
  let owner2: any;
  let owner3: any;
  let nonOwner: any;

  const numConfirmationsRequired = 2;
  let owners: string[] = [];

  beforeEach(async function () {
    [owner1, owner2, owner3, nonOwner] = await ethers.getSigners();
    owners = [];
    owners.push(owner1.address, owner2.address, owner3.address);

    const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
    multiSigWallet = await MultiSigWallet.deploy(
      owners,
      numConfirmationsRequired
    );
  });

  it("should allow owners to submit transactions", async function () {
    const tx = await multiSigWallet.submitTransaction(
      owner1.address,
      ethers.parseEther("1"),
      "0x"
    );
    await tx.wait();

    const transactionCount = await multiSigWallet.getTransactionCount();
    expect(transactionCount).to.equal(1);
  });

  it("should allow owners to confirm transactions", async function () {
    await multiSigWallet.submitTransaction(
      owner1.address,
      ethers.parseEther("1"),
      "0x"
    );

    await multiSigWallet.connect(owner1).confirmTransaction(0);
    await multiSigWallet.connect(owner2).confirmTransaction(0);

    const transaction = await multiSigWallet.getTransaction(0);
    expect(transaction.numConfirmations).to.equal(2);
  });

  it("should execute a transaction when enough confirmations are received", async function () {
    // const SimpleReceiver = await ethers.getContractFactory("SimpleReceiver");
    // const simpleReceiver = await SimpleReceiver.deploy();
    // console.log("1");
    await multiSigWallet.submitTransaction(
      owner2.address,
      ethers.parseEther("0"),
      "0x"
    );

    // console.log("2");
    await multiSigWallet.connect(owner1).confirmTransaction(0);
    await multiSigWallet.connect(owner2).confirmTransaction(0);

    await expect(
      multiSigWallet.connect(owner1).executionTransaction(0)
    ).to.emit(multiSigWallet, "ExecuteTransaction");

    // console.log("3");
    // const initialBalance = await ethers.provider.getBalance(owner1.address);
    // console.log("3.5", " initialBalance ", initialBalance);
    // await multiSigWallet.connect(owner1).executionTransaction(0);

    // console.log("4");
    // const finalBalance = await ethers.provider.getBalance(owner1.address);
    // expect(finalBalance).to.be.gt(initialBalance);
    // console.log("5");
  });

  it("should not execute a transaction with insufficient confirmations", async function () {
    await multiSigWallet.submitTransaction(
      owner1.address,
      ethers.parseEther("1"),
      "0x"
    );

    await multiSigWallet.connect(owner1).confirmTransaction(0);

    await expect(
      multiSigWallet.connect(owner2).executionTransaction(0)
    ).to.be.revertedWith("Can not execut tx");
  });

  it("should allow owners to revoke their confirmation", async function () {
    await multiSigWallet.submitTransaction(
      owner1.address,
      ethers.parseEther("1"),
      "0x"
    );

    await multiSigWallet.connect(owner1).confirmTransaction(0);
    await multiSigWallet.connect(owner2).confirmTransaction(0);

    await multiSigWallet.connect(owner1).revokeTransaction(0);

    const transaction = await multiSigWallet.getTransaction(0);
    expect(transaction.numConfirmations).to.equal(1);
  });

  it("should not allow non-owners to submit transactions", async function () {
    await expect(
      multiSigWallet
        .connect(nonOwner)
        .submitTransaction(owner1.address, ethers.parseEther("1"), "0x")
    ).to.be.revertedWith("Not owner");
  });
});

// ------------------------------------------------------------- MerkleTree Test -----------------------------------------------------------------------------
import { MerkleProofTest } from "../typechain-types";

describe("MerkleProofTest", function () {
  let merkleProofTest: MerkleProofTest;

  before(async function () {
    const MerkleProofTest = await ethers.getContractFactory("MerkleProofTest");
    merkleProofTest = await MerkleProofTest.deploy();
    await merkleProofTest.waitForDeployment();
  });

  it("should correctly calculate the Merkle root", async function () {
    const root = await merkleProofTest.getRoot();
    expect(root).to.not.equal(ethers.ZeroHash);
  });

  it("should verify a valid Merkle proof", async function () {
    const transactions = [
      "alice -> bob",
      "bob -> carol",
      "carol -> alice",
      "dave -> bob",
    ];

    // Calculate leaf hash
    const leafIndex = 2; // We'll prove "carol -> alice"
    const leaf = await merkleProofTest.hashes(leafIndex);

    // Calculate proof
    const proof = [];
    let index = leafIndex;
    for (let i = 0; i < 2; i++) {
      // 2 levels in our tree
      if (index % 2 === 0) {
        proof.push(await merkleProofTest.hashes(index + 1));
      } else {
        proof.push(await merkleProofTest.hashes(index - 1));
      }
      index = Math.floor(index / 2) + 4; // Move to next level
    }

    const root = await merkleProofTest.getRoot();

    const result = await merkleProofTest.verify(proof, root, leaf, leafIndex);
    console.log("root", root, "result", result);
    expect(result).to.be.true;
  });

  it("should not verify an invalid Merkle proof", async function () {
    const invalidLeaf = ethers.keccak256(
      ethers.toUtf8Bytes("invalid -> transaction")
    );
    const root = await merkleProofTest.getRoot();
    const proof = [ethers.ZeroHash, ethers.ZeroHash];

    const result = await merkleProofTest.verify(proof, root, invalidLeaf, 0);
    expect(result).to.be.false;
  });
});

//======================================================== Iterating Map Test ========================================================
// import { TestIterableMap } from '../typechain-types'

// describe("Iterating Map Test", function () {
//   let testIterableMap: any;

//   beforeEach(async () => {
//     const IterableMapping = await ethers.getContractFactory("IterableMapping");
//     const iterableMapping = await IterableMapping.deploy();
//     await iterableMapping.waitForDeployment();

//     const TestIterableMap = await ethers.getContractFactory("TestIterableMap", {
//       libraries: {
//         IterableMapping: await iterableMapping.getAddress(),
//       },
//     });

//     testIterableMap = await TestIterableMap.deploy();
//     await testIterableMap.waitForDeployment();
//   });

//   it("should set and retrieve values correctly", async function () {
//     await testIterableMap.set(testIterableMap, ethers.ZeroAddress, 0);
//     await testIterableMap.set(ethers.getAddress("0x0000000000000000000000000000000000000001"), 100);
//     await testIterableMap.set(ethers.getAddress("0x0000000000000000000000000000000000000002"), 200);
//     await testIterableMap.set(ethers.getAddress("0x0000000000000000000000000000000000000003"), 300);

//     for (let i = 0; i < await testIterableMap.size(); i++) {
//       const key = await testIterableMap.getKeyAtIndex(i);
//       const value = await testIterableMap.get(key);
//       expect(value).to.equal(i * 100);
//     }
//   });

//   it("should remove an entry and update size correctly", async function () {
//     await testIterableMap.set(ethers.ZeroAddress, 0);
//     await testIterableMap.set(ethers.getAddress("0x0000000000000000000000000000000000000001"), 100);
//     await testIterableMap.set(ethers.getAddress("0x0000000000000000000000000000000000000002"), 200);

//     await testIterableMap.remove(ethers.getAddress("0x0000000000000000000000000000000000000001"));

//     expect(await testIterableMap.size()).to.equal(2);
//     expect(await testIterableMap.getKeyAtIndex(0)).to.equal(ethers.ZeroAddress);
//     expect(await testIterableMap.getKeyAtIndex(1)).to.equal(ethers.getAddress("0x0000000000000000000000000000000000000002"));
//   });

//   it("should handle updates correctly", async function () {
//     await testIterableMap.set(ethers.ZeroAddress, 0);
//     await testIterableMap.set(ethers.getAddress("0x0000000000000000000000000000000000000002"), 200);

//     await testIterableMap.set(ethers.getAddress("0x0000000000000000000000000000000000000002"), 300); // Update

//     const value = await testIterableMap.get(ethers.getAddress("0x0000000000000000000000000000000000000002"));
//     expect(value).to.equal(300);
//   });
// });

//======================================================== ERC20 token Test =============================================================
import { ERC20 } from "../typechain-types";

describe("Testing ERC20", function () {
  let ERC20: any;
  let erc20: ERC20;
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
    ERC20 = await ethers.getContractFactory("ERC20");
    erc20 = await ERC20.deploy("Smart Fox", "SFox", 18);
    await erc20.waitForDeployment();

    [owner, addr1, addr2] = await ethers.getSigners();
  });

  it("should have correct name, symbol and decimals", async function () {
    expect(await erc20.name()).to.equal("Smart Fox");
    expect(await erc20.symbol()).to.equal("SFox");
    expect(await erc20.decimals()).to.equal(18);
  });

  it("Should assign total supply of tokens to owner", async function () {
    const initialSupply = ethers.parseUnits("1000", 18);
    await erc20.mint(owner.address, initialSupply);
    expect(await erc20.totalSupply()).to.equal(initialSupply);
  });

  it("Should transfer tokens between accounts", async function () {
    const initialSupply = ethers.parseUnits("1000", 18);
    await erc20.mint(owner.address, initialSupply);
    await erc20.transfer(addr1.address, ethers.parseUnits("100", 18));
    expect(await erc20.balanceOf(addr1.address)).to.equal(
      ethers.parseUnits("100", 18)
    );
    expect(await erc20.balanceOf(owner.address)).to.equal(
      ethers.parseUnits("900", 18)
    );
  });

  it("Should emit Transfer events on transfers", async function () {
    const initialBalance = ethers.parseUnits("1000", 18);
    await erc20.mint(owner.address, initialBalance);
    await expect(erc20.transfer(addr1.address, ethers.parseUnits("100", 18)))
      .to.emit(erc20, "Transfer")
      .withArgs(owner.address, addr1.address, ethers.parseUnits("100", 18));
  });
  it("Should approve tokens for spending by another account", async function () {
    const initialSupply = ethers.parseUnits("1000", 18);
    await erc20.mint(owner.address, initialSupply);

    await erc20.approve(addr1.address, ethers.parseUnits("100", 18));
    expect(await erc20.allowance(owner.address, addr1.address)).to.equal(
      ethers.parseUnits("100", 18)
    );
  });

  it("Should transfer tokens from one account to another using transferFrom", async function () {
    const initialSupply = ethers.parseUnits("1000", 18);
    await erc20.mint(owner.address, initialSupply);

    await erc20.approve(addr1.address, ethers.parseUnits("100", 18));
    await erc20
      .connect(addr1)
      .transferFrom(owner.address, addr2.address, ethers.parseUnits("100", 18));

    expect(await erc20.balanceOf(addr2.address)).to.equal(
      ethers.parseUnits("100", 18)
    );
    expect(await erc20.balanceOf(owner.address)).to.equal(
      ethers.parseUnits("900", 18)
    );
  });

  it("Should burn tokens", async function () {
    const initialSupply = ethers.parseUnits("1000", 18);
    await erc20.mint(owner.address, initialSupply);

    await erc20.burn(owner.address, ethers.parseUnits("100", 18));

    expect(await erc20.balanceOf(owner.address)).to.equal(
      ethers.parseUnits("900", 18)
    );
    expect(await erc20.totalSupply()).to.equal(ethers.parseUnits("900", 18));
  });
});

//======================================================= IERC721 testing ============================================================================

describe("MyNFT Contract", function () {
  let MyNFT: any;
  let myNFT: any;
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
    MyNFT = await ethers.getContractFactory("MyNFT");
    [owner, addr1, addr2] = await ethers.getSigners();
    myNFT = await MyNFT.deploy();
  });

  describe("Deployment", function () {
    it("Should deploy the contract successfully", async function () {
      expect(await myNFT.getAddress()).to.be.properAddress;
    });
  });

  describe("Minting", function () {
    it("Should mint a new NFT", async function () {
      await myNFT.mint(owner.address, 1);
      expect(await myNFT.ownerOf(1)).to.equal(owner.address);
      expect(await myNFT.balanceOf(owner.address)).to.equal(1);
    });

    it("Should not allow minting to the zero address", async function () {
      await expect(
        myNFT.mint(ethers.ZeroAddress, 2)
      ).to.be.revertedWith("mint to zero address");
    });

    it("Should not allow minting an already minted token", async function () {
      await myNFT.mint(owner.address, 3);
      await expect(myNFT.mint(owner.address, 3)).to.be.revertedWith(
        "already minted"
      );
    });
  });

  describe("Burning", function () {
    it("Should burn an NFT", async function () {
      await myNFT.mint(owner.address, 4);
      await myNFT.burn(4);
      await expect(myNFT.ownerOf(4)).to.be.revertedWith("token doesn't exist");
      expect(await myNFT.balanceOf(owner.address)).to.equal(0);
    });

    it("Should not allow burning a token not owned by the caller", async function () {
      await myNFT.mint(owner.address, 5);
      await expect(myNFT.connect(addr1).burn(5)).to.be.revertedWith(
        "not owner"
      );
    });

    it("Should not allow burning a non-existent token", async function () {
      await expect(myNFT.burn(6)).to.be.revertedWith("not owner");
    });
  });

  describe("Transferring", function () {
    it("Should transfer an NFT", async function () {
      await myNFT.mint(owner.address, 7);
      await myNFT.transferFrom(owner.address, addr1.address, 7);
      expect(await myNFT.ownerOf(7)).to.equal(addr1.address);
      expect(await myNFT.balanceOf(owner.address)).to.equal(0);
      expect(await myNFT.balanceOf(addr1.address)).to.equal(1);
    });

    it("Should not allow transferring a token not owned by the caller", async function () {
      await myNFT.mint(owner.address, 8);
      await expect(
        myNFT.connect(addr1).transferFrom(owner.address, addr2.address, 8)
      ).to.be.revertedWith("not authorized");
    });

    it("Should not allow transferring to the zero address", async function () {
      await myNFT.mint(owner.address, 9);
      await expect(
        myNFT.transferFrom(owner.address, ethers.ZeroAddress, 9)
      ).to.be.revertedWith("to = zero address");
    });
  });
});

//======================================================= IERC1155 testing ============================================================================

describe("MultiSmartFox Contract", function () {
  let MultiSmartFox: any;
  let multiSmartFox: any;
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
      [owner, addr1, addr2] = await ethers.getSigners();

      MultiSmartFox = await ethers.getContractFactory("MultiSmartFox");
      multiSmartFox = await MultiSmartFox.deploy();
  });

  describe("Minting", function () {
      it("Should mint a new token", async function () {
          const tokenId = 1;
          const value = 100;

          await multiSmartFox.mint(tokenId, value, "0x");

          const balance = await multiSmartFox.balanceOf(owner.address, tokenId);
          expect(balance).to.equal(value);
      });

      it("Should batch mint tokens", async function () {
          const tokenIds = [1, 2];
          const values = [100, 200];

          await multiSmartFox.batcMint(tokenIds, values, "0x");

          const balance1 = await multiSmartFox.balanceOf(owner.address, tokenIds[0]);
          const balance2 = await multiSmartFox.balanceOf(owner.address, tokenIds[1]);

          expect(balance1).to.equal(values[0]);
          expect(balance2).to.equal(values[1]);
      });
  });

  describe("Burning", function () {
      it("Should burn a token", async function () {
          const tokenId = 1;
          const value = 100;

          await multiSmartFox.mint(tokenId, value, "0x");
          await multiSmartFox.burn(tokenId, value);

          const balance = await multiSmartFox.balanceOf(owner.address, tokenId);
          expect(balance).to.equal(0);
      });

      it("Should batch burn tokens", async function () {
          const tokenIds = [1, 2];
          const values = [100, 200];

          await multiSmartFox.batcMint(tokenIds, values, "0x");
          await multiSmartFox.batchBurn(tokenIds, values);

          const balance1 = await multiSmartFox.balanceOf(owner.address, tokenIds[0]);
          const balance2 = await multiSmartFox.balanceOf(owner.address, tokenIds[1]);

          expect(balance1).to.equal(0);
          expect(balance2).to.equal(0);
      });
  });
});