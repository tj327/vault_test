import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer, Contract, BigNumber, constants, utils } from "ethers";

describe("Vault", function () {
  let owner: Signer;
  let alice: Signer;
  let bob: Signer;
  let carol: Signer;
  let dave: Signer;
  let token: Contract;
  let vault: Contract;

  beforeEach(async function () {
    [owner, alice, bob, carol, dave] = await ethers.getSigners();

    const TokenFactory = await ethers.getContractFactory("MockToken");
    token = await TokenFactory.deploy("MockToken", "MockToken", 18);

    const VaultFactorty = await ethers.getContractFactory("Vault");
    vault = await VaultFactorty.deploy(token.address);

    await token.transfer(await vault.address, 5000);
    await token.transfer(await alice.getAddress(), 5000);
    await token.transfer(await bob.getAddress(), 5000);
    await token.transfer(await carol.getAddress(), 5000);
    await token.transfer(await dave.getAddress(), 5000);

    await token.connect(alice).approve(vault.address, 5000);
    await token.connect(bob).approve(vault.address, 5000);
    await token.connect(carol).approve(vault.address, 5000);
    await token.connect(dave).approve(vault.address, 5000);
  });
  describe("#constructor", () => {
    it("token address should set correctly after contract deploy", async () => {
      expect(token.address).to.equal(await vault.token());
    });
  });
  describe("#deposit", () => {
    it("tokens should transfer to the pool after deposit", async () => {
      const depositAmount = 1000;
      const aliceBalanceBefore = await token.balanceOf(
        await alice.getAddress()
      );
      await vault.connect(alice).deposit(depositAmount);
      const aliceBalanceAfter = await token.balanceOf(await alice.getAddress());
      expect(aliceBalanceAfter).to.equal(aliceBalanceBefore - depositAmount);
    });
    it("user deposited amount should be added when deposited 1 more times", async () => {
      const depositAmount = 1000;
      const aliceBalanceBefore = await token.balanceOf(
        await alice.getAddress()
      );
      await vault.connect(alice).deposit(depositAmount);
      await vault.connect(alice).deposit(depositAmount);
      const aliceBalanceAfter = await token.balanceOf(await alice.getAddress());
      expect(aliceBalanceAfter).to.equal(
        aliceBalanceBefore - depositAmount * 2
      );
    });
    it("should emit the Deposit event", async () => {
      const depositAmount = 1000;
      const tx = await vault.connect(alice).deposit(depositAmount);
      expect(tx)
        .to.emit(vault, "Deposited")
        .withArgs(await alice.getAddress(), vault.address, depositAmount);
    });
  });

  describe("#withdraw", () => {
    it("tokens should transfer to the user after withdraw", async () => {
      const depositAmount = 1000;
      await vault.connect(alice).deposit(depositAmount);

      const aliceBalanceBefore = await token.balanceOf(
        await alice.getAddress()
      );
      const withdrawAmount = 500;
      await vault.connect(alice).withdraw(withdrawAmount);
      const aliceBalanceAfter = await token.balanceOf(await alice.getAddress());

      expect(aliceBalanceAfter).to.equal(4500);
    });

    it("should emit the withdraw event", async () => {
      const depositAmount = 1000;
      await vault.connect(alice).deposit(depositAmount);

      const withdrawAmount = 500;
      const tx = await vault.connect(alice).withdraw(withdrawAmount);

      expect(tx)
        .to.emit(vault, "Withdrawn")
        .withArgs(await alice.getAddress(), withdrawAmount);
    });
    it("should revert if not deposit ", async () => {
      const withdrawAmount = 500;
      await expect(
        vault.connect(alice).withdraw(withdrawAmount)
      ).to.revertedWith("withdraw: not deposited yet");
    });
    it("should revert if withdraw amount is larger than deposit amount", async () => {
      const depositAmount = 444;
      await vault.connect(alice).deposit(depositAmount);

      const index = await vault.userIndex(alice.getAddress());
      console.log("index", index);
      const user = await vault.userInfo(index - 1);
      console.log("user", user);
      const withdrawAmount = 1500;
      await expect(
        vault.connect(alice).withdraw(withdrawAmount)
      ).to.revertedWith("Withdraw: not enough tokens to withdraw");
    });
  });

  describe("#max()", () => {
    it("it should return max users", async () => {
      const depositAmount1 = 130;
      await vault.connect(alice).deposit(depositAmount1);

      const depositAmount2 = 230;
      await vault.connect(bob).deposit(depositAmount2);

      const depositAmount3 = 330;
      await vault.connect(alice).deposit(depositAmount3);

      const depositAmount4 = 330;
      await vault.connect(carol).deposit(depositAmount4);

      await vault.connect(dave).deposit(depositAmount4);

      console.log(
        "amount",
        (await vault.userInfo(0)).amount,
        (await vault.userInfo(1)).amount,
        (await vault.userInfo(2)).amount
      );

      console.log(
        "address",
        (await vault.userInfo(0)).wallet,
        (await vault.userInfo(1)).wallet,
        (await vault.userInfo(2)).wallet
      );
      console.log("max", await vault.max());
      const max1 = (await vault.max())[0];
      console.log("max1", max1);
      expect((await vault.max())[0]).to.equal(await alice.getAddress());
      expect((await vault.max())[1]).to.equal(await carol.getAddress());
    });
  });
});
