import base64
import json
import sys
import os
import nacl.secret
import nacl.public
from nacl.public import PrivateKey, PublicKey, Box

def main():
    # Get private key from environment or command line
    private_key_base64 = os.environ.get('ENCRYPTION_PRIVATE_KEY') or (sys.argv[1] if len(sys.argv) > 1 else None)
    if not private_key_base64:
        print("Please provide the private key as an argument or set ENCRYPTION_PRIVATE_KEY environment variable")
        sys.exit(1)
    
    # Get encrypted payload file path
    if len(sys.argv) < 3:
        print("Please provide the path to the encrypted payload JSON file")
        sys.exit(1)
    
    encrypted_payload_path = sys.argv[2]
    
    # Read and parse the encrypted payload
    with open(encrypted_payload_path, 'r') as f:
        encrypted_payload = json.load(f)
    
    # Convert from Base64
    private_key_bytes = base64.b64decode(private_key_base64)
    nonce = base64.b64decode(encrypted_payload['nonce'])
    encrypted_data = base64.b64decode(encrypted_payload['encryptedData'])
    encrypted_key = base64.b64decode(encrypted_payload['encryptedKey'])
    
    # Create the private key object
    private_key = PrivateKey(private_key_bytes)
    
    try:
        # Decrypt the symmetric key
        # In Python's PyNaCl, we need to use Box differently than in TweetNaCl.js
        # We need to derive the public key from our private key
        public_key = private_key.public_key
        
        # Create a Box with our private key and our own public key (since the encrypted key was created with our public key)
        box = Box(private_key, public_key)
        
        # Decrypt the symmetric key
        symmetric_key = box.decrypt(encrypted_key)
        
        # Use the symmetric key to decrypt the data
        secret_box = nacl.secret.SecretBox(symmetric_key)
        decrypted_data = secret_box.decrypt(encrypted_data, nonce)
        
        # Write the decrypted data to a file
        output_path = 'decrypted-evidence.bin'
        with open(output_path, 'wb') as f:
            f.write(decrypted_data)
        
        print(f"Decryption successful! Decrypted data written to {output_path}")
        
        # If it's an image, try to determine the format and add the correct extension
        if decrypted_data.startswith(b'\xff\xd8\xff'):
            # JPEG signature
            jpg_path = 'decrypted-evidence.jpg'
            with open(jpg_path, 'wb') as f:
                f.write(decrypted_data)
            print(f"Detected JPEG image, also saved as {jpg_path}")
        elif decrypted_data.startswith(b'\x89PNG\r\n\x1a\n'):
            # PNG signature
            png_path = 'decrypted-evidence.png'
            with open(png_path, 'wb') as f:
                f.write(decrypted_data)
            print(f"Detected PNG image, also saved as {png_path}")
        
    except Exception as e:
        print(f"Decryption failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 