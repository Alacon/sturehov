import crypto from 'crypto';

// Generate UUID from date
export const generateUUID = (date: string) => {
    const namespace = '12345678-1234-5678-1234-567812345678'; // A fixed, valid UUID
    const hash = crypto.createHash('sha1').update(namespace + date).digest('hex');
  
    // Format the hash into a valid UUID
    return [
      hash.slice(0, 8),
      hash.slice(8, 12),
      '5' + hash.slice(13, 16), // Set the version to 5
      ((parseInt(hash.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20), // Set the variant
      hash.slice(20, 32),
    ].join('-');
  };