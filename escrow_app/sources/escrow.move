module escrow_app::escrow;

const ENotSeller: u64 = 0;

public struct Escrow<T: key + store> has key {
    id: UID,
    item: T,
    price: u64,
    seller: address,
}

public fun create_escrow<T: key + store>(item: T, price: u64, ctx: &mut TxContext){
    let escrow = Escrow {
        id: object::new(ctx),
        item,
        price,
        seller: ctx.sender(),
    };

    transfer::share_object(escrow);
}

public fun cancel_escrow<T: key + store>(escrow: Escrow<T>, ctx: &mut TxContext){
    assert!(ctx.sender() == escrow.seller, ENotSeller);
    let Escrow {id, item, price:_, seller} = escrow;
    id.delete();
    transfer::public_transfer(item, seller);
}

