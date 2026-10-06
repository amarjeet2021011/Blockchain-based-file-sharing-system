const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const CONTRACT_DIR = path.join(__dirname, "..", "client", "src", "contract");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const { chainId } = await hre.ethers.provider.getNetwork();
  console.log(`Deploying Upload from ${deployer.address} on chain ${chainId}...`);

  const upload = await hre.ethers.deployContract("Upload");
  await upload.waitForDeployment();
  const address = await upload.getAddress();
  console.log(`Upload deployed to: ${address}`);

  fs.mkdirSync(CONTRACT_DIR, { recursive: true });

  const artifact = await hre.artifacts.readArtifact("Upload");
  fs.writeFileSync(
    path.join(CONTRACT_DIR, "Upload.json"),
    JSON.stringify({ abi: artifact.abi }, null, 2) + "\n"
  );

  const addressesFile = path.join(CONTRACT_DIR, "addresses.json");
  const addresses = fs.existsSync(addressesFile)
    ? JSON.parse(fs.readFileSync(addressesFile, "utf8"))
    : {};
  addresses[chainId.toString()] = address;
  fs.writeFileSync(addressesFile, JSON.stringify(addresses, null, 2) + "\n");

  console.log(`Wrote ABI and address to ${path.relative(process.cwd(), CONTRACT_DIR)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
