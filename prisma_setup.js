const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

const gzPath = path.join(__dirname, 'node_modules', '@prisma', 'engines', 'query_engine-windows.dll.node.gz');
const destPath = path.join(__dirname, 'node_modules', '@prisma', 'engines', 'query_engine-windows.dll.node');

function run() {
  console.log("Checking if query engine archive exists...");
  if (!fs.existsSync(gzPath)) {
    console.log("Query engine archive not found in engines folder yet.");
    return;
  }
  
  const stats = fs.statSync(gzPath);
  console.log(`Current archive size: ${stats.size} bytes`);
  
  // 7.45 MB is approximately 7,812,000 bytes.
  // We check if it is close to full size or if the download task has completed.
  if (stats.size < 7800000) {
    console.log("Download is still writing payload bytes. Please check back shortly.");
    return;
  }

  console.log("Archive fully downloaded. Beginning decompression...");
  try {
    const gzBuffer = fs.readFileSync(gzPath);
    const uncompressed = zlib.gunzipSync(gzBuffer);
    fs.writeFileSync(destPath, uncompressed);
    console.log("Decompression completed successfully!");
    
    // Purge compressed archive to save disk space
    try {
      fs.unlinkSync(gzPath);
    } catch (e) {}
    
    console.log("Triggering client code generation...");
    const output = execSync('npx --no-install prisma generate --schema=prisma/schema.prisma', { encoding: 'utf-8' });
    console.log("Generation completed successfully!");
    console.log(output);
  } catch (err) {
    console.error("Execution failed:", err);
  }
}

run();
