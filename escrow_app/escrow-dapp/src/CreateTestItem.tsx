import { useState } from 'react';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { Transaction, coinWithBalance } from '@mysten/sui/transactions';

export function CreateTestItem() {
	const account = useCurrentAccount();
	const dAppKit = useDAppKit();
	const [message, setMessage] = useState('');

	async function createTestItem() {
		if (!account) return;
		try {
			const tx = new Transaction();
			const coin = coinWithBalance({ balance: 1_000_000 }); // 0.001 SUI
			tx.transferObjects([coin], account.address);
			const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
			if (result.FailedTransaction) {
				setMessage('Transaction failed');
				return;
			}
			setMessage(`Created! Digest: ${result.Transaction.digest}`);
		} catch (e) {
			setMessage(e instanceof Error ? e.message : String(e));
		}
	}

	return (
		<div>
			<button onClick={createTestItem} disabled={!account}>
				Create test item
			</button>
			{message && <p>{message}</p>}
		</div>
	);
}