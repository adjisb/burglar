#!/usr/bin/env node
const fs = require("fs");
const ethers = require("ethers");
const yargs = require('yargs/yargs')
const {hideBin} = require('yargs/helpers')
const {BigNumber} = require("ethers");

async function baseCoin(src, dst, quantity) {
  return src.sendTransaction({
    to: dst,
    value: quantity,
  });
}

async function erc20(contractAddr, src, dst, quantity) {
  const contract = new ethers.Contract(contractAddr,
    [{
      "type": "function",
      "inputs": [{"type": "address"}, {"type": "uint256"}],
      "name": "transfer",
      "outputs": [{"type": "bool"}],
      "stateMutability": "nonpayable",
    }], src)
  return contract.transfer(dst, quantity);
}

async function erc721(contractAddr, src, dst, tokenId) {
  const contract = new ethers.Contract(contractAddr,
    [{
      "type": "function",
      "inputs": [{"type": "address"}, {"type": "address"}, {"type": "uint256"}],
      "name": "transferFrom",
      "outputs": [],
      "stateMutability": "nonpayable",
    }], src)
  return contract.transferFrom(await src.getAddress(), dst, tokenId);

}


function argVal(args) {
  const {s, d, u, q, t, c} = args;
  const provider = new ethers.providers.JsonRpcProvider(u);
  return {
    ...args,
    src: provider.getSigner(ethers.utils.getAddress(s)),
    dst: ethers.utils.getAddress(d),
    quantity: q && ethers.utils.parseEther(q),
    tokenId: t && ethers.BigNumber.from(t),
    contract: c && ethers.utils.getAddress(c)
  }
}

async function stealFrom(provider, data) {
  if (data.baseCoin && Array.isArray(data.baseCoin)) {
    for (const t of data.baseCoin) {
      const src = provider.getSigner(ethers.utils.getAddress(t.src));
      const dst = ethers.utils.getAddress(t.dst);
      const quantity = ethers.utils.parseEther(t.quantity);
      console.log("\tbaseCoin from", t.src, "to", dst, "quantity", quantity.toString())
      const tx = await baseCoin(src, dst, quantity);
      console.log("\t\t", tx.hash);
    }
  }
  if (data.erc20 && Array.isArray(data.erc20)) {
    for (const e of data.erc20) {
      const contract = ethers.utils.getAddress(e.contract);
      console.log("\terc20", e.contract)
      for (const t of e.transfer) {
        const src = provider.getSigner(ethers.utils.getAddress(t.src));
        const dst = ethers.utils.getAddress(t.dst);
        const quantity = ethers.utils.parseEther(t.quantity);
        console.log("\t\tfrom", t.src, "to", dst, "quantity", quantity.toString())
        const tx = await erc20(contract, src, dst, quantity);
        console.log("\t\t\t", tx.hash);
      }
    }
  }
  if (data.erc721 && Array.isArray(data.erc721)) {
    for (const e of data.erc721) {
      const contract = ethers.utils.getAddress(e.contract);
      console.log("\terc721", e.contract)
      for (const t of e.transfer) {
        const src = provider.getSigner(ethers.utils.getAddress(t.src));
        const dst = ethers.utils.getAddress(t.dst);
        const tokens = t.tokens.map(y => ethers.BigNumber.from(y));
        console.log("\t\tfrom", t.src, "to", dst)
        for (const tokenId of tokens) {
          console.log("\t\t\ttokenId", tokenId.toHexString(), tokenId.toString())
          const tx = await erc721(contract, src, dst, tokenId);
          console.log("\t\t\t\t", tx.hash);
        }
      }
    }
  }
}

async function steal(args) {
  const rawdata = fs.readFileSync(args.f);
  const data = JSON.parse(rawdata);
  for (const u of Object.keys(data)) {
    console.log("URL", u)
    const provider = new ethers.providers.JsonRpcProvider(u);
    await stealFrom(provider, data[u]);
  }
}

yargs(hideBin(process.argv))
  .command('basecoin', 'steal basecoin', y =>
      y
        .describe("u", "blockchain node url")
        .string('s').describe('s', 'Source address').alias("s", "src")
        .string('d').describe('d', 'Destination address').alias("d", "dst")
        .string('q').describe('q', 'Quantity in ethers').alias("q", "quantity")
        .demandOption(['u', 's', 'd', 'q']),
    async (args) => {
      const a = argVal(args);
      console.log("stealing base coin using node", a.u,
        "from", a.s, "to", a.dst, "quantity", a.quantity.toString())
      const tx = await baseCoin(a.src, a.dst, a.quantity);
      console.log(tx.hash);
    }
  )
  .command('erc20', 'steal erc20', y =>
      y
        .describe("u", "blockchain node url")
        .string('s').describe('s', 'Source address').alias("s", "src")
        .string('d').describe('d', 'Destination address').alias("d", "dst")
        .string('q').describe('q', 'Quantity in ethers').alias("q", "quantity")
        .string('c').describe('c', 'Contract address').alias("c", "contract")
        .demandOption(['u', 's', 'd', 'q', 'c']),
    async (args) => {
      const a = argVal(args);
      console.log("stealing erc20 using node", a.u, "contract", a.contract,
        "from", a.s, "to", a.dst,
        "quantity", a.quantity.toString())
      const tx = await erc20(a.contract, a.src, a.dst, a.quantity)
      console.log(tx.hash);
    })
  .command('erc721', 'steal erc721', y =>
      y
        .describe("u", "blockchain node url")
        .string('s').describe('s', 'Source address').alias("s", "src")
        .string('d').describe('d', 'Destination address').alias("d", "dst")
        .string('t').describe('t', 'Token Id').alias("t", "token")
        .string('c').describe('c', 'Contract address').alias("c", "contract")
        .demandOption(['u', 's', 'd', 't', 'c']),
    async (args) => {
      const a = argVal(args);
      console.log("stealing erc721 using node", a.u, "contract", a.contract,
        "from", a.s, "to", a.dst,
        "tokenId", a.tokenId.toHexString(), a.tokenId.toString())
      const tx = await erc721(a.contract, a.src, a.dst, a.tokenId);
      console.log(tx.hash);
    })
  .command('steal', 'steal from an input file', y =>
      y
        .string('f').describe('f', 'File name').alias("f", "file")
        .demandOption(['f']),
    steal
  )
  .demandCommand(1)
  .usage('Usage: $0 <command> [options]')
  .help('h')
  .alias('h', 'help')
  .strict()
  .parse().catch(err => console.error(err.toString()))

