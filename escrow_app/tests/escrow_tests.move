#[test_only]
module escrow_app::escrow_tests;

use escrow_app::escrow::{Self, Escrow};
use sui::coin;
use sui::sui::SUI;
use sui::test_scenario as ts;

const SELLER: address = @0xA;
const BUYER: address = @0xB;

public struct Item has key, store { 
    id: UID 
}

#[test]
fun buy_works(){
    let mut s = ts::begin(SELLER); 
    let item = Item {id: object::new(s.ctx()) };
    escrow::create_escrow(item, 100, s.ctx());

    s.next_tx(BUYER);
    let e = s.take_shared<Escrow<Item>>(); /*there is only one Escrow<Item> in the chain so we don't need to address it more specifically*/
    let pay = coin::mint_for_testing<SUI>(100, s.ctx());
    escrow::buy(e, pay, s.ctx());

    s.end();
}

#[test]
fun cancel_works(){
    let mut s = ts::begin(SELLER);
    let item = Item {id: object::new(s.ctx())};
    escrow::create_escrow(item, 100, s.ctx());

    s.next_tx(SELLER);
    let e = s.take_shared<Escrow<Item>>();
    escrow::cancel_escrow(e, s.ctx());

    s.end();
}

#[test, expected_failure]
fun cancel_by_non_seller_fails(){
    let mut s = ts::begin(SELLER);
    let item = Item {id: object::new(s.ctx())};
    escrow::create_escrow(item, 100, s.ctx());

    s.next_tx(BUYER);
    let e = s.take_shared<Escrow<Item>>();
    escrow::cancel_escrow(e, s.ctx());

    s.end();
}

#[test, expected_failure]
fun buy_wrong_price_fails(){
    let mut s = ts::begin(SELLER);
    let item = Item {id: object::new(s.ctx())};
    escrow::create_escrow(item, 100, s.ctx());

    s.next_tx(BUYER);
    let e = s.take_shared<Escrow<Item>>();
    let pay = coin::mint_for_testing<SUI>(95, s.ctx());
    escrow::buy(e, pay, s.ctx());

    s.end();
}





