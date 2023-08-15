IDIR=./trezor-crypto/
JDIR=./trezor-crypto/ed25519-donna/
CFLAGS=-W -Wall

SRCS   = bignum.c ecdsa.c curves.c secp256k1.c nist256p1.c rand.c hmac.c bip32.c bip39.c pbkdf2.c base58.c base32.c
SRCS  += address.c
SRCS  += script.c
SRCS  += ripemd160.c
SRCS  += sha2.c
SRCS  += sha3.c
SRCS  += hasher.c
SRCS  += blake256.c
SRCS  += blake2b.c blake2s.c
SRCS  += groestl.c
SRCS  += rc4.c
SRCS  += nem.c
SRCS  += segwit_addr.c cash_addr.c
SRCS  += memzero.c
SRCS  += shamir.c
SRCS  += hmac_drbg.c
SRCS  += rfc6979.c
SRCS  += slip39.c
SRCS  += ed25519.c curve25519-donna-scalarmult-base.c ed25519-sha3.c ed25519-keccak.c
SRCS  += ed25519-donna-basepoint-table.c ed25519-donna-32bit-tables.c ed25519-donna-impl-base.c
SRCS  += curve25519-donna-32bit.c curve25519-donna-helpers.c modm-donna-32bit.c

OBJS   = $(SRCS:.c=.o)

app : main.o $(OBJS)
	gcc -o app $^

main.o : main.c
	gcc $(CFLAGS) -c $< -I$(IDIR) -I$(JDIR)

%.o : $(IDIR)%.c $(IDIR)%.h $(IDIR)options.h
	gcc $(CFLAGS) -c $< -I$(IDIR) -I$(JDIR)

%.o : $(JDIR)%.c $(JDIR)%.h $(IDIR)options.h
	gcc $(CFLAGS) -c $< -I$(IDIR) -I$(JDIR)

.PHONY : clean

clean:
	rm *.o