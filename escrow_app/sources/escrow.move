module escrow_app::escrow;

use sui::coin::Coin;
use sui::sui::SUI;
use sui::event;

const ENotSeller: u64 = 0;
const EWrongPrice: u64 = 1;

public struct Escrow<T: key + store> has key {
    id: UID,
    item: T,
    price: u64,
    seller: address,
}

public struct EscrowCreated has copy, drop { escrow_id: ID, seller: address, price: u64 }
public struct EscrowCancelled has copy, drop { escrow_id: ID }
public struct EscrowCompleted has copy, drop { escrow_id: ID, buyer: address, price: u64 }

/*Creates an escrow object that takes inside a generic object T which must have key and store abilities */
public fun create_escrow<T: key + store>(item: T, price: u64, ctx: &mut TxContext) {
    let escrow = Escrow {
        id: object::new(ctx),
        item,
        price,
        seller: ctx.sender(),
    };
    event::emit(EscrowCreated {
        escrow_id: escrow.id.to_inner(),
        seller: escrow.seller,
        price,
    });
    transfer::share_object(escrow);
}

/*Cancels the created Escrow*/
public fun cancel_escrow<T: key + store>(escrow: Escrow<T>, ctx: &TxContext) {
    assert!(ctx.sender() == escrow.seller, ENotSeller);
    let Escrow { id, item, price: _, seller } = escrow;
    event::emit(EscrowCancelled { escrow_id: id.to_inner() });
    id.delete();
    transfer::public_transfer(item, seller);
}

/*Buyer pays the price by giving a Coin object with the exact SUI the seller demanded and gives*/
public fun buy<T: key + store>(escrow: Escrow<T>, payment: Coin<SUI>, ctx: &TxContext) {
    let Escrow { id, item, price, seller } = escrow;
    assert!(payment.value() == price, EWrongPrice);
    event::emit(EscrowCompleted { escrow_id: id.to_inner(), buyer: ctx.sender(), price });
    id.delete();
    transfer::public_transfer(payment, seller);
    transfer::public_transfer(item, ctx.sender());
}