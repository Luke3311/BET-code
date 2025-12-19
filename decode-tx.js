// Quick script to decode the Solana transaction
import { Transaction, VersionedTransaction } from '@solana/web3.js';

const txBase64 = "AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAqI7IyN3Wy9Sfjd4E5hKSC7ErENV3v/IqRZCwIm7Z5A+or306aVVn0wF8H/ArqwUcmUDcGzmbPgwLAk1F0JlADgAIBBAgcxm7UN1ERWkK1kFEyxPZoMoYR5ejet9hiWF0qNVHQASaDEsCC+pbwCkOavPVhXaXXmLAgICCFOUCyeNF6aizha7d3WVKRwd3GXu24fhANfUEXh4O7EwhL0z8KcL0ie1P8tI/kEgFwmK8v0jF1wCtFlF3STZeSRWWf5uq8d+1n8AMGRm/lIRcy/+ytunLDm+e8jOW7xfcSayxDmzpAAAAABN+teWL/sd2SXQqftebQDOYZW6i7OpH9B++YYMXpe7gG3fbh7nWP3hhCXbzkbM3athr8TYO5DSf+vfko2KGL/MVQc9B8UKWhT+25CZswk3vcQebAc2SsQWjTZ6JN70BvxMgiqR1r31D4iGofI/7CDD5MsDGm8yAeit2YOh6plqUEBAAFAkCcAAAEAAkDAQAAAAAAAAAGBAIHAwEKDEBUiQAAAAAABgUBAlQKBAQDAAAGAAAAAAAAAAAEASaDEsCC+pbwCkOavPVhXaXXmLAgICCFOUCyeNF6aizhAADFUHPQfFCloU/tuQmbMJN73EHmwHNkrEFo02eiTe9AbwAA";

try {
  const txBuffer = Buffer.from(txBase64, 'base64');
  console.log('📦 Transaction buffer length:', txBuffer.length);
  
  // Try to deserialize as legacy transaction
  try {
    const tx = Transaction.from(txBuffer);
    console.log('\n✅ Legacy Transaction decoded successfully!');
    console.log('📝 Number of instructions:', tx.instructions.length);
    console.log('\n🔍 Instructions:');
    tx.instructions.forEach((ix, i) => {
      console.log(`\n  Instruction ${i + 1}:`);
      console.log('    Program ID:', ix.programId.toBase58());
      console.log('    Keys:', ix.keys.length);
      console.log('    Data length:', ix.data.length, 'bytes');
      console.log('    Data (hex):', ix.data.toString('hex'));
    });
  } catch (legacyError) {
    console.log('❌ Not a legacy transaction:', legacyError.message);
    
    // Try versioned transaction
    try {
      const versionedTx = VersionedTransaction.deserialize(txBuffer);
      console.log('\n✅ Versioned Transaction decoded successfully!');
      console.log('📝 Number of instructions:', versionedTx.message.compiledInstructions.length);
      
      console.log('\n📋 Account Keys:');
      const accountKeys = versionedTx.message.staticAccountKeys;
      accountKeys.forEach((key, i) => {
        console.log(`  ${i}: ${key.toBase58()}`);
      });
      
      console.log('\n🔍 Compiled Instructions:');
      versionedTx.message.compiledInstructions.forEach((ix, i) => {
        const programId = accountKeys[ix.programIdIndex];
        console.log(`\n  Instruction ${i + 1}:`);
        console.log('    Program Index:', ix.programIdIndex);
        console.log('    Program ID:', programId.toBase58());
        console.log('    Accounts:', ix.accountKeyIndexes);
        console.log('    Data length:', ix.data.length, 'bytes');
        console.log('    Data (hex):', Buffer.from(ix.data).toString('hex'));
        
        // Check if this might be a CreateATA instruction
        const dataHex = Buffer.from(ix.data).toString('hex');
        if (dataHex.startsWith('00') || dataHex.startsWith('01')) {
          console.log('    ⚠️  Might be an Associated Token Program instruction!');
        }
      });
    } catch (versionedError) {
      console.log('❌ Not a versioned transaction either:', versionedError.message);
    }
  }
  
} catch (error) {
  console.error('❌ Failed to decode transaction:', error);
}
