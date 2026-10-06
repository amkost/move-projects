import { useEffect, useState } from 'react';
import { useCurrentAccount, useCurrentClient, useDAppKit } from '@mysten/dapp-kit-react'; 
import { Transaction, coinWithBalance } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';

const PACKAGE_ID = '0x1f3463afc8e6b2e183aaee01c9628027bb15389d71bd8710127538029bb38e6c';

type Listing = { escrowId: string; itemId: string; price: string; seller: string; itemType: string };

export function Listings() {
	const client = useCurrentClient();
	const dAppKit = useDAppKit();
	const account = useCurrentAccount();
	const [listings, setListings] = useState<Listing[]>([]);
	const [message, setMessage] = useState('');

	async function load() {
		const page = await client.listEvents({
			filter: { eventType: `${PACKAGE_ID}::escrow::EscrowCreated` },
			order: 'descending',
			limit: 50,
		});

		const created = page.events.map((event) => {
			const json = event.json as { escrow_id: string; price: string; seller: string };
			return { escrowId: json.escrow_id, price: json.price, seller: json.seller };
		});
		if (created.length === 0) {
			setListings([]);
			return;
		}

		const { objects } = await client.getObjects({
			objectIds: created.map((l) => l.escrowId),
			include: { json: true }, 
		});

		const open: Listing[] = [];
		for (let i = 0; i < created.length; i++) {
			const obj = objects[i];
			if (obj instanceof Error) continue;
			const itemType = obj.type.slice(obj.type.indexOf('<') + 1, obj.type.lastIndexOf('>'));
			const fields = obj.json as { item: { id: string } };
			open.push({ ...created[i], itemId: fields.item.id, itemType });
		}
		setListings(open);
	}

	useEffect(() => {
		load();
	}, [client]);

	async function buy(l: Listing) {
		try {
			const tx = new Transaction();
			tx.moveCall({
				target: `${PACKAGE_ID}::escrow::buy`,
				typeArguments: [l.itemType],
				arguments: [tx.object(l.escrowId), coinWithBalance({ balance: BigInt(l.price) })],
			});
			const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
			if (result.FailedTransaction) {
				setMessage('Transaction failed');
				return;
			}
			setMessage(`Bought! Digest: ${result.Transaction.digest}`);
			await load();
		} catch (e) {
			setMessage(e instanceof Error ? e.message : String(e));
		}
	}


	async function cancel(l: Listing) {
		try {
			const tx = new Transaction();
			tx.moveCall({
				target: `${PACKAGE_ID}::escrow::cancel_escrow`,
				typeArguments: [l.itemType],
				arguments: [tx.object(l.escrowId)],
			});
			const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
			if (result.FailedTransaction) {
				setMessage('Transaction failed');
				return;
			}
			setMessage(`Cancelled! Digest: ${result.Transaction.digest}`);
			await load();
		} catch (e) {
			setMessage(e instanceof Error ? e.message : String(e));
		}
	}

	return (
		<div className="section">
			<h2>Open listings</h2>
			{listings.length === 0 && <p>No open listings</p>}
			{listings.map((l) => (
                <div className="listing" key={l.escrowId}>
                    <span className="item-id">{l.itemId}</span>
                    <span className="price">{Number(l.price) / 1_000_000_000} SUI</span>
                    <button className="btn" onClick={() => buy(l)}>Buy</button>
                    {account && normalizeSuiAddress(account.address) === normalizeSuiAddress(l.seller) && (
                        <button className="btn btn-cancel" onClick={() => cancel(l)}>Cancel</button>
                    )}
                </div>
            ))}
			{message && <p>{message}</p>}
		</div>
	);
}