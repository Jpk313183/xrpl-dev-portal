---
html: cross-chain-bridges.html
parent: xrpl-interoperability.html
blurb: Cross-chain bridges for the XRP Ledger enable value in the form of XRP and other tokens (IOUs) to move efficiently between blockchains.
labels:
  - Blockchain
---
# Cross-Chain Bridges

Cross-chain bridges for the XRP Ledger enable value in the form of XRP and other tokens (IOUs) to move efficiently between blockchains such as the XRP Ledger and its sidechains.


A locking chain is a blockchain that holds assets that are then put into trust when a bridge to an issuing chain is created.

An issuing chain is an independent ledger with its own consensus algorithm and transaction types and rules. It acts as its own blockchain.

Both the locking and issuing chains operate as parllel networks with independent nodes and validators. They rely on independent [witness servers](witness-servers.md) to watch transactions between the two chains and attest that assets have moved into specifically designated accounts.

## Terminology

* Bridge: A method of moving assets/value from one blockchain to another.

* Witness: Independent servers that are aware of the locking and issuing chains. See [witness servers](witness-server.md) for more information.

* Cross-chain transfer: A transfer of assets from one chain to another.

* Source chain: The chain that a cross-chain transfer begins from. The transfer is from the source chain and to the destination chain.

* Destination chain: The chain that a cross-chain transfer ends at. The transfer is from the source chain and to the destination chain.

* Locking chain: The chain on which the bridge locks and unlocks assets.

* Issuing chain: The chain on which the bridge mints and burns assets.

* Door account: A special type of account that is used to move assets from one chain to another. The door account on a locking chain is used to put assets into trust, and the door account on an issuing chain used to issue wrapped assets. 

* Cross-chain claim ID: A special identifier used for cross-chain transfers. A cross-chain claim ID represents *one* cross-chain transfer of value.

## How Do Cross-Chain Transactions Work?

### Pre-requisites

You must ensure that the following are set up and running before initiating cross-chain transactions. 

* Ensure that the witness server(s) are up and running.
* Set up a bridge between the two chains, including a _door account_ on each chain. On one chain, the asset is locked and unlocked, hence the name "locking chain", and on the other chain, assets are minted and burned, or issued and reclaimed, hence the name "issuing chain".
* When using the XRP Ledger Mainnet as one of the chains, ensure that  the `Sidechains` amendment is enabled in the `rippled.cfg` configuration file. 

### Working of Cross-Chain Transactions 
 
At a high-level, cross-chain transactions involve the following steps: 

1. Claim a cross-chain claim ID on the issuing chain.
2. Submit a cross-chain transfer transaction on the locking chain, attaching the claimed cross-chain claim ID and include a reward for the witness servers. This locks the asset on the locking chain.
3. Obtain the attestations from the witness servers that the transaction occurred on the issuing chain.
4. Submit a transaction claim for the transferred value on the issuing chain, attaching the attestation as proof that the value was indeed transferred.
5. The rewards are then distributed to the witness servers' accounts on the issuing chain.

Consider an example where Alice wants to send XRP from her account on the XRP Ledger Mainnet (locking chain) to her account sAlice on a sidechain (issuing chain).

* A bridge that transfers XRP between the XRP Ledger Mainnet and the sidechain has been set up with XChainCreateBridge.
* Witness servers are up and running.
* Alice has also already run a XChainCreateAccountCommit transaction at some point, so she has an account on the sidechain.

<!-- Add image of just the bridge created-->

![Cross-chain Transactions](img/xrpl-bridging-solution.png "Cross-chain transactions")

1. sAlice first checks out a claim ID with XChainCreateClaimID on the sidechain, specifying the above bridge. She retrieves the claim ID from the transaction metadata or the `xchaincreateclaimid` RPC call.

2. Alice then takes the cross-chain claim ID from sAlice’s XChainCreateClaimID transaction and submits a XChainCommit transaction on the Mainnet with that claim ID, locking up a specified amount of XRP. She specifies sAlice’s account in the OtherChainDestination field.

3. The witnesses then take note of the XChainCommit transaction and submit XChainAddAttestation transactions on the sidechain, attesting to the fact that the XChainCommit transaction did in fact occur on the Mainnet.

4. When there are enough XChainAddAttestation signatures to reach quorum, the XRP is automatically released on the sidechain to sAlice’s account.

5. If the XRP is not automatically released, for whatever reason (such as Alice forgetting to specify sAlice’s account in the OtherChainDestination field), then sAlice submits a XChainClaim transaction on the sidechain, specifying her account as the destination. This then releases the XRP on the sidechain to sAlice’s account.

## Transactions

### Bridge Control: XChainModifyBridge

This transaction modifies a Bridge ledger object on one of the chains that the bridge connects. You can only change the SignaturesReward or MinAccountCreateAmount values, because changing the bridge itself (either door account or either currency) would essentially render all cross-chain funds useless - you’d be better off creating another bridge instead. This transaction must be sent by the door account, and correctly signed using whatever signer list set it has.

### Cross-Chain Transfer: XChainCreateClaimID

This transaction checks out a cross-chain claim ID that is used for a cross-chain transfer. It is submitted on the destination chain, not the source chain. This is the first step of a cross-chain transfer of value. 

A cross-chain claim ID essentially represents one cross-chain transfer of value. 

### Cross-Chain Transfer: XChainCommit

This transaction initiates a cross-chain transfer of value. This is done on the source chain, and locks/burns the value (“commits” the value), so that the equivalent amount can be minted/unlocked on the destination chain. Essentially, it tells the witness servers that the value was locked/burned. This value is tied to a specific cross-chain claim ID (which is included in the transaction).

The account that owns the cross-chain claim ID on the destination chain is the account that controls the funds on the other end of the bridge. The funds go to the destination account specified in the XChainCommit transaction, if specified. If the destination account is not specified, then the claim ID owner must submit an XChainClaim transaction to determine where the funds will go on the destination chain.

### Cross-Chain Transfer: XChainAddAttestation

This transaction is submitted on the destination chain, by the witness server or anyone with access to the signatures from the witness server. It is a proof that an event (essentially just a locking/burning of funds) happened on the source chain.

When enough witnesses have submitted their proofs on the destination chain that an event has occurred, the funds will be released to the destination account in the XChainCommit transaction, if specified. Otherwise, the claim ID owner must submit an XChainClaim transaction to determine where the funds will go on the destination chain.

### Cross-Chain Transfer: XChainClaim

This transaction completes a cross-chain transfer of value. It allows a user to claim the value on the destination chain - the equivalent of the value locked on the source chain. A user can only claim the value if they own the cross-chain claim ID associated with the value locked on the source chain (the Account field). The user can send the funds to anyone (the Destination field). This transaction is only needed if an OtherChainDestination is not specified in the XChainCommit transaction, or if something goes wrong with the automatic transfer of funds.

### Other: XChainCreateAccountCommit

This transaction creates an account on the sidechain. In order to start a cross-chain transfer, you need an account on the destination chain, which is a bit of a paradox situation - so to avoid that, this is a special transaction that can create an account on the destination chain for you.

## How to Set Up a Sidechain? 

The [`sidechain_cli`](https://github.com/XRPLF/sidechain-cli) is a commandline tool that simplifies setting up bridges and issuing chains on your local machine. 

Follow the [tutorial](https://github.com/XRPLF/sidechain-cli/blob/main/scripts/tutorial.sh) to walk through the steps of creating a bridge and completing your first cross-chain transaction. 


## XRPL Custom-chain Explorer 

The XRP Ledger Explorer provides a way to look up historical transactions, accounts, ledgers, fees, exchange rates, timestamps, sequence numbers, node uptime, IP addresses, topology, versions and peers for the XRP Ledger mainchain. 

Similarly, you can use the XRP Ledger Sidechain Explorer to look up information for an XRP Ledger sidechain. Use the following syntax to access the XRPL Sidechain Explorer:

`https://sidechain.xrpl.org/_<SIDECHAIN-NODE-DNS-ADDRESS-OR-IP>_`




