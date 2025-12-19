import { Connection, PublicKey, Transaction, sendAndConfirmTransaction, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import dotenv from 'dotenv';
import bs58 from 'bs58';

dotenv.config();

const TREASURY_WALLET = 'Gnu8xZ8yrhEurUiKokWbKJqe6Djdmo3hUHge8NLbtNeH';
const TOKEN_MINT = 'EHEUCcYsjm6WfCFkLxvZ2ysB3niAsXyQoqsed59jpump';
const RPC_URL = 'https://api.mainnet-beta.solana.com';

async function createTreasuryATA() {
  const connection = new Connection(RPC_URL, 'confirmed');
  
  const treasuryPubkey = new PublicKey(TREASURY_WALLET);
  const mintPubkey = new PublicKey(TOKEN_MINT);
  
  // Get the associated token account address
  const ata = await getAssociatedTokenAddress(
    mintPubkey,
    treasuryPubkey
  );
  
  console.log('Treasury Wallet:', TREASURY_WALLET);
  console.log('Token Mint:', TOKEN_MINT);
  console.log('Associated Token Account (ATA):', ata.toBase58());
  
  // Check if ATA already exists
  const ataInfo = await connection.getAccountInfo(ata);
  
  if (ataInfo) {
    console.log('✅ ATA already exists! No action needed.');
    return;
  }
  
  console.log('❌ ATA does not exist.');
  console.log('\n=== OPTIONS TO CREATE THE ATA ===\n');
  
  console.log('Option 1: Use Solana CLI (if you have it installed):');
  console.log(`  spl-token create-account ${TOKEN_MINT} --owner ${TREASURY_WALLET}\n`);
  
  console.log('Option 2: Send a small amount of this token to the treasury wallet');
  console.log('  This will automatically create the ATA\n');
  
  console.log('Option 3: Use a web tool like:');
  console.log(`  https://spl-token-ui.netlify.app/\n`);
  
  console.log('Option 4: If you have a private key, run this script with CREATE_ATA=true');
  console.log('  You\'ll need to add your private key to .env as PAYER_PRIVATE_KEY\n');
  
  // If user wants to create via this script
  if (process.env.CREATE_ATA === 'true' && process.env.PAYER_PRIVATE_KEY) {
    console.log('Creating ATA...');
    
    try {
      const payerKeypair = Keypair.fromSecretKey(bs58.decode(process.env.PAYER_PRIVATE_KEY));
      
      const transaction = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          payerKeypair.publicKey,
          ata,
          treasuryPubkey,
          mintPubkey,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
      
      const signature = await sendAndConfirmTransaction(connection, transaction, [payerKeypair]);
      console.log('✅ ATA created successfully!');
      console.log('Transaction:', signature);
    } catch (error) {
      console.error('Failed to create ATA:', error.message);
    }
  }
}

createTreasuryATA().catch(console.error);
