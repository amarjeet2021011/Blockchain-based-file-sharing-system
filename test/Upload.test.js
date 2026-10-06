const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Upload", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const upload = await ethers.deployContract("Upload");
    return { upload, owner, alice, bob };
  }

  it("stores files under the caller's address only", async function () {
    const { upload, owner, alice } = await loadFixture(deployFixture);
    await expect(upload.add("ipfs://cid1", "image/png", "cat.png"))
      .to.emit(upload, "FileAdded")
      .withArgs(owner.address, 0, "ipfs://cid1", "cat.png");

    const mine = await upload.display(owner.address);
    expect(mine).to.have.length(1);
    expect(mine[0].url).to.equal("ipfs://cid1");
    expect(mine[0].fileType).to.equal("image/png");
    expect(mine[0].fileName).to.equal("cat.png");

    expect(await upload.connect(alice).display(alice.address)).to.have.length(0);
  });

  it("rejects empty URLs", async function () {
    const { upload } = await loadFixture(deployFixture);
    await expect(upload.add("", "x", "y")).to.be.revertedWith("URL required");
  });

  it("blocks reading another user's files without access", async function () {
    const { upload, owner, alice } = await loadFixture(deployFixture);
    await upload.add("ipfs://cid1", "text/plain", "a.txt");
    await expect(upload.connect(alice).display(owner.address)).to.be.revertedWith(
      "You don't have access"
    );
  });

  it("grants, revokes and re-grants access", async function () {
    const { upload, owner, alice } = await loadFixture(deployFixture);
    await upload.add("ipfs://cid1", "text/plain", "a.txt");

    await expect(upload.allow(alice.address))
      .to.emit(upload, "AccessGranted")
      .withArgs(owner.address, alice.address);
    expect(await upload.connect(alice).display(owner.address)).to.have.length(1);
    expect(await upload.hasAccess(owner.address, alice.address)).to.equal(true);
    expect(await upload.connect(alice).sharedWithMe()).to.deep.equal([owner.address]);

    await expect(upload.disallow(alice.address))
      .to.emit(upload, "AccessRevoked")
      .withArgs(owner.address, alice.address);
    await expect(upload.connect(alice).display(owner.address)).to.be.revertedWith(
      "You don't have access"
    );
    expect(await upload.connect(alice).sharedWithMe()).to.deep.equal([]);

    await upload.allow(alice.address);
    const list = await upload.shareAccess();
    expect(list).to.have.length(1);
    expect(list[0].user).to.equal(alice.address);
    expect(list[0].access).to.equal(true);
    expect(await upload.connect(alice).sharedWithMe()).to.deep.equal([owner.address]);
  });

  it("tracks multiple grantees independently", async function () {
    const { upload, alice, bob } = await loadFixture(deployFixture);
    await upload.allow(alice.address);
    await upload.allow(bob.address);
    await upload.disallow(alice.address);

    const list = await upload.shareAccess();
    expect(list.map((a) => [a.user, a.access])).to.deep.equal([
      [alice.address, false],
      [bob.address, true],
    ]);
  });

  it("validates allow/disallow inputs", async function () {
    const { upload, owner, alice } = await loadFixture(deployFixture);
    await expect(upload.allow(ethers.ZeroAddress)).to.be.revertedWith("Invalid address");
    await expect(upload.allow(owner.address)).to.be.revertedWith("Cannot share with yourself");
    await upload.allow(alice.address);
    await expect(upload.allow(alice.address)).to.be.revertedWith("Already has access");
    await upload.disallow(alice.address);
    await expect(upload.disallow(alice.address)).to.be.revertedWith("User has no access");
  });
});
