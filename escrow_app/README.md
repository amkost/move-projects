# Sui Escrow dApp

An on-chain, fixed-price escrow marketplace on Sui. A seller locks any object into a shared escrow, a buyer pays the exact SUI price and receives the object in the same transaction. The seller can cancel to get it back.

* **Network:** Sui testnet
* **Package ID:** `0x1f3463afc8e6b2e183aaee01c9628027bb15389d71bd8710127538029bb38e6c`
* **Live demo:** https://amk-sui-escrow-dapp.vercel.app/ 
>If your wallet connection is flagging the site as malicious, you can resolve this by running the application locally (see the local setup guide below).
* **Stack:** Move module, React + TypeScript frontend (`@mysten/dapp-kit-react`, `@mysten/sui`)



## How it works

1. **List an item for sale** – The seller enters an object ID and a price in SUI. The object is wrapped into a shared `Escrow` and is listed for sale.
2. **Buy** – Any buyer sees the open listing and clicks Buy. The seller is paid and the buyer receives the item atomically.
3. **Cancel** – Only the seller can cancel. The item is returned to them and the escrow is deleted.

The project has two parts:

* **On-Chain:** Move package containing the module and its tests.
* **Off-Chain:** React + TypeScript frontend that interacts with the module.

## Module (Smart Contract)

Module `escrow_app::escrow` (`escrow_app/sources/escrow.move`) is generic over any object with `key + store`.

| Function        | Caller | Effect                                                                                                                                    |
| --------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `create_escrow` | Seller | Locks the item with a price and shares the `Escrow`. Emits `EscrowCreated`.                                                               |
| `buy`           | Buyer  | Requires a `Coin<SUI>` equal to the price, pays the seller, sends the item to the buyer, and deletes the escrow. Emits `EscrowCompleted`. |
| `cancel_escrow` | Seller | Returns the item and deletes the escrow. Aborts with `ENotSeller` for anyone else. Emits `EscrowCancelled`.                               |

A wrong payment amount aborts with `EWrongPrice`.

### Module design

The escrow is generic, so the same module can handle different Sui object types.
These objects must have the **key** and **store** abilities.

The item is stored directly inside the `Escrow` object while it is listed. This means the seller no longer controls the item while it is for sale; the only ways to retrieve it are through `buy` or `cancel_escrow`.

The escrow is a **shared object** so that any buyer can interact with an open listing. 
Buy and cancel consume and delete the escrow.

The module requires a `Coin<SUI>` whose value is exactly the listing price.
This keeps payment logic simple on the blockchain side of the dapp and avoids having the module handle overpayments or refunds.
The frontend handles the exact-coin requirement automatically, so the buyer does not have to manually construct or split a payment coin.

## Frontend

Located in `escrow_app/escrow-dapp`, created from the `@mysten/dapp` React template.

| Component            | Purpose                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| `ListItem.tsx`       | Form to list an object for sale: reads its type, converts SUI to MIST, and calls `create_escrow`. |
| `Listings.tsx`       | Shows open listings with Buy, and Cancel for the seller.                                          |
| `CreateTestItem.tsx` | Creates a small SUI Coin object from the user's balance to use as a test item. This is a testing convenience and is not part of the core marketplace functionality.                                 |

### How listings are loaded

The contract keeps no on-chain registry. `Listings.tsx` queries `EscrowCreated` events, then fetches those escrow objects.

Events provide the history of created escrows, while the current existence of each escrow determines whether it is still open. Escrows that were bought or cancelled are deleted on-chain, so they fail to load and are skipped; what remains are the open listings.

The item type is read from the escrow's type, so the same UI works for different object types. The escrow ID is used internally for `buy` and `cancel_escrow`, while the item's ID is displayed to the user.

### Payment handling

The buy transaction requires a coin with exactly the listing price.

The frontend uses `coinWithBalance` to construct that payment from the buyer's available SUI balance instead of requiring manual coin selection or splitting.

### Seller authorization in the UI

The Cancel button is only shown when the connected wallet matches the listing's seller address.

This is only a UI convenience. The actual authorization is enforced by the Move contract through `ENotSeller`, so hiding the button does not provide the security boundary.

## Listing limitations

Listings are loaded from the 50 most recent `EscrowCreated` events when the page opens and after a successful buy or cancel. Because of this, an open listing can drop out of view once 50 newer escrows have been created, even though it is still on-chain. There is no live subscription, and listing a new item requires a page reload. A production version could use an indexer. The module already emits the necessary events for such an extension.

## Testing

Four Move tests simulate a seller (`@0xA`) and a buyer (`@0xB`) with `test_scenario`:

| Test                         | What it covers                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------- |
| `buy_works`                  | Buying with the exact price in SUI completes without aborting.                  |
| `cancel_works`               | The seller cancelling their own escrow completes without aborting.              |
| `cancel_by_non_seller_fails` | A different address attempting to cancel aborts.                                |
| `buy_wrong_price_fails`      | A buyer paying a different amount than the price aborts.                        |



Run the tests with:

```bash
cd escrow_app
sui move test
```

## Run locally

You need Node.js, pnpm, a Sui wallet set to **testnet**, and testnet SUI from the faucet.

```bash
cd escrow_app/escrow-dapp
pnpm install
pnpm dev
```


## Project structure

```text
escrow_app/
├── sources/
│   └── escrow.move
├── tests/
│   └── escrow_tests.move
└── escrow-dapp/
    └── src/
        ├── App.tsx
        ├── ListItem.tsx
        ├── Listings.tsx
        └── CreateTestItem.tsx
```
