// import {
//   time,
//   loadFixture,
// } from "@nomicfoundation/hardhat-toolbox/network-helpers";
// import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
// import { expect } from "chai";
// import hre from "hardhat";

// describe("Lock", function () {
//   // We define a fixture to reuse the same setup in every test.
//   // We use loadFixture to run this setup once, snapshot that state,
//   // and reset Hardhat Network to that snapshot in every test.
//   async function deployOneYearLockFixture() {
//     const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
//     const ONE_GWEI = 1_000_000_000;

//     const lockedAmount = ONE_GWEI;
//     const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

//     // Contracts are deployed using the first signer/account by default
//     const [owner, otherAccount] = await hre.ethers.getSigners();

//     const Lock = await hre.ethers.getContractFactory("Lock");
//     const lock = await Lock.deploy(unlockTime, { value: lockedAmount });

//     const Simple = await hre.ethers.getContractFactory("SimpleStorage")
//     const simple =  await Simple.deploy();

//     return { lock, unlockTime, lockedAmount, owner, otherAccount, simple };
//   }

//   describe("Deployment", function () {
//     it("Simple", async function() {
//       const { simple } = await loadFixture(deployOneYearLockFixture);
//       expect(await simple.storedData()).to.equal("123");
//     })

//     it("Should set the right unlockTime", async function () {
//       const { lock, unlockTime } = await loadFixture(deployOneYearLockFixture);

//       expect(await lock.unlockTime()).to.equal(unlockTime);
//     });

//     it("Should set the right owner", async function () {
//       const { lock, owner } = await loadFixture(deployOneYearLockFixture);

//       expect(await lock.owner()).to.equal(owner.address);
//     });

//     it("Should receive and store the funds to lock", async function () {
//       const { lock, lockedAmount } = await loadFixture(
//         deployOneYearLockFixture
//       );

//       expect(await hre.ethers.provider.getBalance(lock.target)).to.equal(
//         lockedAmount
//       );
//     });

//     it("Should fail if the unlockTime is not in the future", async function () {
//       // We don't use the fixture here because we want a different deployment
//       const latestTime = await time.latest();
//       const Lock = await hre.ethers.getContractFactory("Lock");
//       await expect(Lock.deploy(latestTime, { value: 1 })).to.be.revertedWith(
//         "Unlock time should be in the future"
//       );
//     });
//   });

//   describe("Withdrawals", function () {
//     describe("Validations", function () {
//       it("Should revert with the right error if called too soon", async function () {
//         const { lock } = await loadFixture(deployOneYearLockFixture);

//         await expect(lock.withdraw()).to.be.revertedWith(
//           "You can't withdraw yet"
//         );
//       });

//       it("Should revert with the right error if called from another account", async function () {
//         const { lock, unlockTime, otherAccount } = await loadFixture(
//           deployOneYearLockFixture
//         );

//         // We can increase the time in Hardhat Network
//         await time.increaseTo(unlockTime);

//         // We use lock.connect() to send a transaction from another account
//         await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
//           "You aren't the owner"
//         );
//       });

//       it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
//         const { lock, unlockTime } = await loadFixture(
//           deployOneYearLockFixture
//         );

//         // Transactions are sent using the first signer by default
//         await time.increaseTo(unlockTime);

//         await expect(lock.withdraw()).not.to.be.reverted;
//       });
//     });

//     describe("Events", function () {
//       it("Should emit an event on withdrawals", async function () {
//         const { lock, unlockTime, lockedAmount } = await loadFixture(
//           deployOneYearLockFixture
//         );

//         await time.increaseTo(unlockTime);

//         await expect(lock.withdraw())
//           .to.emit(lock, "Withdrawal")
//           .withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
//       });
//     });

//     describe("Transfers", function () {
//       it("Should transfer the funds to the owner", async function () {
//         const { lock, unlockTime, lockedAmount, owner } = await loadFixture(
//           deployOneYearLockFixture
//         );

//         await time.increaseTo(unlockTime);

//         await expect(lock.withdraw()).to.changeEtherBalances(
//           [owner, lock],
//           [lockedAmount, -lockedAmount]
//         );
//       });
//     });
//   });
// });

// SPDX-License-Identifier: MIT
import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";

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

        const initialBidder1Balance = await ethers.provider.getBalance(await bidder1.getAddress());
        await auction.connect(bidder1).withdraw();
        const finalBidder1Balance = await ethers.provider.getBalance(await bidder1.getAddress());

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
      auction = await DutchAuction.deploy(startingPrice, discountRate, nft.getAddress(), 1);
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
      expect(priceAfterOneSecond).to.equal(startingPrice-discountRate);

      await ethers.provider.send("evm_increaseTime", [5]); // Increase time by 5 seconds
      await ethers.provider.send("evm_mine"); // Mine a new block

      const priceAfterSixSeconds = await auction.getPrice();
      expect(priceAfterSixSeconds).to.equal(startingPrice-discountRate*BigInt(6));
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
      const initialBalance = await ethers.provider.getBalance(await buyer1.getAddress());

      const tx = await auction.connect(buyer1).buy({ value: price+ethers.parseEther("1") });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed*receipt.gasPrice;
      
      const finalBalance = await ethers.provider.getBalance(await buyer1.getAddress());
      expect(finalBalance).to.be.equal(initialBalance-price-BigInt(gasUsed)+ethers.parseEther("0.0001"));
  });

  it("should not allow purchase after the auction ends", async function () {
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]); // Increase time by 7 days + 1 second
      await ethers.provider.send("evm_mine"); // Mine a new block

      await expect(auction.connect(buyer1).buy({ value: ethers.parseEther("1") }))
          .to.be.revertedWith("Auction has been ended.");
  });

  it("should not allow purchase if not enough Ether is sent", async function () {
      await ethers.provider.send("evm_increaseTime", [1]); // Increase time by 1 second
      await ethers.provider.send("evm_mine"); // Mine a new block

      const price = await auction.getPrice();
      console.log("price",price)
    //   console.log("price", price - BigInt(500000000000000))
      await expect(auction.connect(buyer1).buy({ value: price - BigInt(500000000000000) }))
          .to.be.revertedWith("cost < price");
  });
});