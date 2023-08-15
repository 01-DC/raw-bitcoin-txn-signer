# Raw Bitcoin Transaction Signer
This script written in C signs a raw transaction and creates a double hashed digest that can be directly broadcasted to the network.

This script is dependent on the `trezor-crypto` library and uses a Makefile to generate all the necessary object files that our C script will require. This includes elliptic curve digital signature algorithms and various hashing algorithms like SHA256. It also includes functions for various path derivations according to BIP44 standard.

[trezor-crypto](https://github.com/trezor/trezor-crypto) is an open-source library which contains the kernel-level code used in the Trezor wallet.
