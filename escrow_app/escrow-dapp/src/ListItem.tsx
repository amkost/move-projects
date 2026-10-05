import { useState } from 'react';
import { useDAppKit, useCurrentClient } from '@mysten/dapp-kit-react';
import { Transaction } from '@mysten/sui/transactions';

const PACKAGE_ID = '0x1f3463afc8e6b2e183aaee01c9628027bb15389d71bd8710127538029bb38e6c';

export function ListItem() {
	const dAppKit = useDAppKit();
	const client = useCurrentClient();
	const [itemId, setItemId] = useState('');
	const [price, setPrice] = useState('');

	async function listForSale() {
		const { object } = await client.getObject({ objectId: itemId.trim() });
		const priceInMist = BigInt(Math.round(Number(price) * 1_000_000_000)); // SUI -> MIST
		const tx = new Transaction();
		tx.moveCall({
			target: `${PACKAGE_ID}::escrow::create_escrow`,
			typeArguments: [object.type],
			arguments: [tx.object(itemId.trim()), tx.pure.u64(priceInMist)],
		});
		await dAppKit.signAndExecuteTransaction({ transaction: tx });
	}

	return (
		<div>
			<input
				placeholder="Object ID (0x...)"
				value={itemId}
				onChange={(e) => setItemId(e.target.value)}
			/>
			<input
				type="number"
				step="any"
				min="0"
				placeholder="Price in SUI"
				value={price}
				onChange={(e) => setPrice(e.target.value)}
			/>
			<button onClick={listForSale} disabled={!itemId || !price}>
				List for sale
			</button>
		</div>
	);
}

