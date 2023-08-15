#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "bip39.h"
#include "bip32.h"
#include "ecdsa.h"
#include "secp256k1.h"
#include "curves.h"

#define VERSION_PUBLIC 0x043587cf
#define VERSION_PRIVATE 0x04358394

const char *MNEMONIC = "weasel sketch gown slice surface assault boss club cricket two world aim poverty aisle copy gift coral train vote matter document local equip gorilla";
// Unsigned Txn: 02000000011d14ba64ab14758355fe27eee94a2288f9196849525baebd0bc388578c1e3c99010000001976a914a3ae3019db0da0b8519c54cbe94affa054d65fe088acffffffff0270170000000000001976a914ed614881f32c024a80d1b6b58dfed8f493f41c7288ac5e361000000000001976a9141fcf0cbd9490bee4e03346717f3e769c813c4b0588ac00000000

// input struct
typedef struct
{
    uint8_t txn_id[32];
    uint32_t index;
    uint8_t script_sig_len;
    uint8_t script_sig[1000];
    uint32_t sequence;
} TX_IN;

// output struct
typedef struct
{
    uint64_t value;
    uint8_t script_pubkey_len;
    uint8_t script_pub_key[1000];
} TX_OUT;

// total transaction struct
typedef struct
{
    uint32_t version;
    uint8_t input_n;
    TX_IN *inp;
    uint8_t output_n;
    TX_OUT *out;
    uint32_t locktime;
} TXN;

// convert hex string to byte array
size_t convert_hex(const char *src, uint8_t *dest, size_t count)
{
    size_t i;
    int value;
    for (i = 0; i < count && sscanf(src + i * 2, "%2x", &value) == 1; i++)
    {
        dest[i] = value;
    }
    return i;
}

// parse byte array into transaction struct
TXN parse_txn_to_struct(uint8_t *txn_bytes)
{
    TXN tx;

    memcpy(&tx.version, txn_bytes, sizeof(tx.version)); // version value

    tx.input_n = txn_bytes[4]; // number of inputs Multiple Input handling

    uint8_t offset = 5; // used 5 bytes from txn_bytes
    tx.inp = (TX_IN *)malloc(tx.input_n * sizeof(TX_IN));

    for (int i = 0; i < tx.input_n; ++i)
    {
        // transaction hash first
        memcpy(&tx.inp[i].txn_id, txn_bytes + offset, sizeof(tx.inp[i].txn_id));
        offset += sizeof(tx.inp[i].txn_id);

        // previous output index
        memcpy(&tx.inp[i].index, txn_bytes + offset, sizeof(tx.inp[i].index));
        offset += sizeof(tx.inp[i].index);

        // script sig length
        tx.inp[i].script_sig_len = txn_bytes[offset];
        offset += 1;

        // script sig
        memcpy(&tx.inp[i].script_sig, txn_bytes + offset, tx.inp[i].script_sig_len);
        offset += tx.inp[i].script_sig_len;

        // sequence
        memcpy(&tx.inp[i].sequence, txn_bytes + offset, sizeof(tx.inp[i].sequence));
        offset += sizeof(tx.inp[i].sequence);
    }

    tx.output_n = txn_bytes[offset];
    offset += 1;

    tx.out = (TX_OUT *)malloc(tx.output_n * sizeof(TX_OUT));
    for (int i = 0; i < tx.output_n; ++i)
    {
        // value
        memcpy(&tx.out[i].value, txn_bytes + offset, sizeof(tx.out[i].value));
        offset += sizeof(tx.out[i].value);

        // scriptPubKey length
        tx.out[i].script_pubkey_len = txn_bytes[offset];
        offset += 1;

        // scriptPubKey itself
        memcpy(&tx.out[i].script_pub_key, txn_bytes + offset, tx.out[i].script_pubkey_len);
        offset += tx.out[i].script_pubkey_len;
    }

    // locktime
    memcpy(&tx.locktime, txn_bytes + offset, sizeof(tx.locktime));
    offset += sizeof(tx.locktime);
    return tx;
}

// function to properly copy transaction structs without causing segmentation fault
void copy_txn(TXN *dest, TXN *src)
{
    dest->version = src->version;
    dest->input_n = src->input_n;
    dest->inp = (TX_IN *)malloc(sizeof(TX_IN) * src->input_n);
    for (int i = 0; i < src->input_n; ++i)
    {
        memcpy(dest->inp[i].txn_id, src->inp[i].txn_id, 32);
        dest->inp[i].index = src->inp[i].index;
        dest->inp[i].script_sig_len = src->inp[i].script_sig_len;
        memcpy(dest->inp[i].script_sig, src->inp[i].script_sig, src->inp[i].script_sig_len);
        dest->inp[i].sequence = src->inp[i].sequence;
    }
    dest->output_n = src->output_n;
    dest->out = (TX_OUT *)malloc(sizeof(TX_OUT) * src->output_n);
    for (int i = 0; i < src->output_n; ++i)
    {
        dest->out[i].value = src->out[i].value;
        dest->out[i].script_pubkey_len = src->out[i].script_pubkey_len;
        memcpy(dest->out[i].script_pub_key, src->out[i].script_pub_key, src->out[i].script_pubkey_len);
    }
    dest->locktime = src->locktime;
}

// convert transaction struct into byte array
int parse_txn_to_bytes(TXN *txn, uint8_t *dest)
{
    uint8_t *t = dest;
    memcpy(t, &txn->version, 4);
    t += 4;

    memcpy(t, &txn->input_n, 1);
    t += 1;

    for (int i = 0; i < txn->input_n; i++)
    {
        memcpy(t, txn->inp[i].txn_id, 32);
        t += 32;

        memcpy(t, &txn->inp[i].index, 4);
        t += 4;

        memcpy(t, &txn->inp[i].script_sig_len, 1);
        t += 1;

        memcpy(t, txn->inp[i].script_sig, txn->inp[i].script_sig_len);
        t += txn->inp[i].script_sig_len;

        memcpy(t, &txn->inp[i].sequence, 4);
        t += 4;
    }

    memcpy(t, &txn->output_n, 1);
    t += 1;

    for (int i = 0; i < txn->output_n; i++)
    {
        memcpy(t, &txn->out[i].value, 8);
        t += 8;

        memcpy(t, &txn->out[i].script_pubkey_len, 1);
        t += 1;

        memcpy(t, txn->out[i].script_pub_key, txn->out[i].script_pubkey_len);
        t += txn->out[i].script_pubkey_len;
    }

    memcpy(t, &txn->locktime, 4);
    t += 4;

    // basically the total bytes filled
    return t - dest;
}

int main()
{
    uint8_t seed[64];
    mnemonic_to_seed(MNEMONIC, "", seed, NULL);
    printf("Seed: ");
    for (int i = 0; i < 64; ++i)
    {
        printf("%02x", seed[i]);
    }
    printf("\n");

    HDNode node;
    hdnode_from_seed(seed, 64, SECP256K1_NAME, &node);

    hdnode_private_ckd_prime(&node, 44); // purpose
    hdnode_private_ckd_prime(&node, 1);  // coin type

    uint32_t fingerprint = hdnode_fingerprint(&node);

    hdnode_private_ckd_prime(&node, 0); // account type
    hdnode_fill_public_key(&node);

    char account_tprv[112];
    char account_tpub[112];
    hdnode_serialize_private(&node, fingerprint, VERSION_PRIVATE, account_tprv, sizeof(account_tprv));
    hdnode_serialize_public(&node, fingerprint, VERSION_PUBLIC, account_tpub, sizeof(account_tpub));

    hdnode_private_ckd(&node, 0); // chain

    char address[36];
    HDNode child_node = node;

    hdnode_private_ckd(&child_node, 0); // address_index
    hdnode_fill_public_key(&child_node);

    ecdsa_get_address(child_node.public_key, 0x6F, HASHER_SHA2_RIPEMD, HASHER_SHA2D, address, sizeof(address));

    unsigned char public_key[33];
    unsigned char private_key[32];
    memcpy(public_key, child_node.public_key, 33);
    memcpy(private_key, child_node.private_key, 32);

    printf("Account Extended Public Key: %s\n", account_tpub);
    printf("Account Extended Private Key: %s\n", account_tprv);

    printf("Address: %s\n", address);
    printf("Public Key: ");
    for (int i = 0; i < 33; ++i)
    {
        printf("%02x", public_key[i]);
    }
    printf("\n");

    printf("Private Key: ");
    for (int i = 0; i < 32; ++i)
    {
        printf("%02x", private_key[i]);
    }
    printf("\n");

    char *original_txn_str = "02000000011d14ba64ab14758355fe27eee94a2288f9196849525baebd0bc388578c1e3c99010000001976a914a3ae3019db0da0b8519c54cbe94affa054d65fe088acffffffff0270170000000000001976a914ed614881f32c024a80d1b6b58dfed8f493f41c7288ac5e361000000000001976a9141fcf0cbd9490bee4e03346717f3e769c813c4b0588ac00000000";
    uint8_t original_txn[(strlen(original_txn_str) / 2)];
    size_t original_txn_len = convert_hex(original_txn_str, original_txn, sizeof(original_txn));
    printf("Unsigned Transaction: ");
    for (int i = 0; i < original_txn_len; ++i)
    {
        printf("%02x", original_txn[i]);
    }
    printf("\n");

    TXN tx = parse_txn_to_struct(original_txn);

    // signing process now
    for (int i = 0; i < tx.input_n; ++i)
    {
        TXN tx_temp;
        // memcpy(&tx_temp, &tx, sizeof(tx)); segmentation fault due to internal pointers
        copy_txn(&tx_temp, &tx);

        // we can sign one input at a time based on it's private key so remove other inputs before signing
        for (int j = 0; j < tx.input_n; ++j)
        {
            if (j != i)
                tx_temp.inp[j].script_sig_len = 0;
        }

        uint8_t txn_bytes[500];
        int txn_bytes_len = parse_txn_to_bytes(&tx_temp, txn_bytes);

        int txn_msg_len = txn_bytes_len + 4;
        uint8_t txn_msg[txn_msg_len];
        memcpy(txn_msg, txn_bytes, txn_bytes_len);
        memcpy(txn_msg + txn_bytes_len, "\x01\x00\x00\x00", 4); // adding the SIGHASH_ALL Flag to transactions

        // double hash the transaction
        uint8_t hash[32];
        sha256_Raw(txn_msg, txn_msg_len, hash);
        sha256_Raw(hash, 32, hash);

        // sign the hash using ecdsa
        uint8_t signature[64];
        ecdsa_sign_digest(&secp256k1, child_node.private_key, hash, signature, NULL, NULL);

        // convert signature to DER format
        uint8_t der_signature[72];
        size_t der_signature_len = ecdsa_sig_to_der(signature, der_signature);

        // Generating the scriptSig
        uint8_t scriptSig[1 + der_signature_len + 1 + 1 + 33];

        scriptSig[0] = der_signature_len + 1;
        memcpy(scriptSig + 1, der_signature, der_signature_len);
        scriptSig[1 + der_signature_len] = 0x01;
        scriptSig[1 + der_signature_len + 1] = 0x21;
        memcpy(scriptSig + 1 + der_signature_len + 2, child_node.public_key, 33);

        // adding the scriptSig into each input section
        tx.inp[i].script_sig_len = sizeof(scriptSig);
        memcpy(tx.inp[i].script_sig, scriptSig, sizeof(scriptSig));
    }

    printf("Signed TXN: \n");
    uint8_t signed_txn[500];
    int signed_txn_len = parse_txn_to_bytes(&tx, signed_txn);
    printf("%d\n", signed_txn_len);
    for (int i = 0; i < signed_txn_len; ++i)
    {
        printf("%02x", signed_txn[i]);
    }
    printf("\n");

    return 0;
}
