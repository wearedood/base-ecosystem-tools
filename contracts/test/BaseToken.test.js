const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('BaseToken', function () {
  let baseToken;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  const TOKEN_NAME = 'Base Ecosystem Token';
  const TOKEN_SYMBOL = 'BET';
  const INITIAL_SUPPLY = ethers.parseEther('1000000');
  const MAX_SUPPLY = ethers.parseEther('1000000000');

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    const BaseToken = await ethers.getContractFactory('BaseToken');
    baseToken = await BaseToken.deploy(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      INITIAL_SUPPLY,
      owner.address
    );
    await baseToken.waitForDeployment();
  });

  describe('Deployment', function () {
    it('Should set the right name and symbol', async function () {
      expect(await baseToken.name()).to.equal(TOKEN_NAME);
      expect(await baseToken.symbol()).to.equal(TOKEN_SYMBOL);
    });

    it('Should set the right owner', async function () {
      expect(await baseToken.owner()).to.equal(owner.address);
    });

    it('Should assign the total supply to the owner', async function () {
      const ownerBalance = await baseToken.balanceOf(owner.address);
      expect(await baseToken.totalSupply()).to.equal(ownerBalance);
      expect(ownerBalance).to.equal(INITIAL_SUPPLY);
    });

    it('Should set the correct max supply', async function () {
      expect(await baseToken.MAX_SUPPLY()).to.equal(MAX_SUPPLY);
    });
  });

  describe('Minting', function () {
    it('Should allow owner to mint tokens', async function () {
      const mintAmount = ethers.parseEther('1000');
      await expect(baseToken.mint(addr1.address, mintAmount))
        .to.emit(baseToken, 'TokensMinted')
        .withArgs(addr1.address, mintAmount);

      expect(await baseToken.balanceOf(addr1.address)).to.equal(mintAmount);
    });

    it('Should not allow non-owner to mint tokens', async function () {
      const mintAmount = ethers.parseEther('1000');
      await expect(
        baseToken.connect(addr1).mint(addr2.address, mintAmount)
      ).to.be.revertedWithCustomError(baseToken, 'OwnableUnauthorizedAccount');
    });

    it('Should not allow minting beyond max supply', async function () {
      const excessiveAmount = MAX_SUPPLY;
      await expect(
        baseToken.mint(addr1.address, excessiveAmount)
      ).to.be.revertedWith('Minting would exceed max supply');
    });
  });

  describe('Burning', function () {
    beforeEach(async function () {
      // Transfer some tokens to addr1 for burning tests
      await baseToken.transfer(addr1.address, ethers.parseEther('1000'));
    });

    it('Should allow token holders to burn their tokens', async function () {
      const burnAmount = ethers.parseEther('100');
      const initialBalance = await baseToken.balanceOf(addr1.address);

      await expect(baseToken.connect(addr1).burn(burnAmount))
        .to.emit(baseToken, 'TokensBurned')
        .withArgs(addr1.address, burnAmount);

      expect(await baseToken.balanceOf(addr1.address)).to.equal(
        initialBalance - burnAmount
      );
    });

    it('Should allow burning from approved accounts', async function () {
      const burnAmount = ethers.parseEther('50');
      
      // Approve addr2 to burn tokens from addr1
      await baseToken.connect(addr1).approve(addr2.address, burnAmount);
      
      await expect(baseToken.connect(addr2).burnFrom(addr1.address, burnAmount))
        .to.emit(baseToken, 'TokensBurned')
        .withArgs(addr1.address, burnAmount);
    });
  });

  describe('Token Information', function () {
    it('Should return correct token information', async function () {
      const tokenInfo = await baseToken.getTokenInfo();
      
      expect(tokenInfo[0]).to.equal(TOKEN_NAME); // name
      expect(tokenInfo[1]).to.equal(TOKEN_SYMBOL); // symbol
      expect(tokenInfo[2]).to.equal(18); // decimals
      expect(tokenInfo[3]).to.equal(INITIAL_SUPPLY); // totalSupply
      expect(tokenInfo[4]).to.equal(MAX_SUPPLY); // maxSupply
    });
  });

  describe('ERC20 Permit', function () {
    it('Should have correct domain separator', async function () {
      const domainSeparator = await baseToken.DOMAIN_SEPARATOR();
      expect(domainSeparator).to.not.equal(ethers.ZeroHash);
    });
  });
});
