import { useEffect, useState } from 'react';
import { useCurrentClient } from '@mysten/dapp-kit-react';

const PACKAGE_ID = '0x1f3463afc8e6b2e183aaee01c9628027bb15389d71bd8710127538029bb38e6c';

type Listing = { escrowId: string; price: string };

export function Listings() {
	const client = useCurrentClient();
	const [listings, setListings] = useState<Listing[]>([]);

	useEffect(() => {
		async function load() {
			const page = await client.listEvents({
				filter: { eventType: `${PACKAGE_ID}::escrow::EscrowCreated` },
				order: 'descending',
				limit: 50,
			});
			console.log(page.events);

			const created = page.events.map((event) => {
				const json = event.json as { escrow_id: string; price: string };
				return { escrowId: json.escrow_id, price: json.price };
			});
			if (created.length === 0) return;

			const { objects } = await client.getObjects({
				objectIds: created.map((l) => l.escrowId),
			});
			const open = created.filter((_, i) => !(objects[i] instanceof Error));
			setListings(open);
		}
		load();
	}, [client]);

	return (
		<div>
			<h2>Open listings</h2>
			{listings.length === 0 && <p>No open listings</p>}
			{listings.map((l) => (
				<p key={l.escrowId}>
					{l.escrowId} - {Number(l.price) / 1_000_000_000} SUI
				</p>
			))}
		</div>
	);
}