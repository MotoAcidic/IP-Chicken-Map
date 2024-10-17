const express = require('express');
const { exec } = require('child_process');
const localDevices = require('local-devices');
const path = require('path');

const app = express();
app.use(express.static('public'));

// Function to perform nslookup to get the device name
function nslookup(ip) {
  return new Promise((resolve) => {
    exec(`nslookup ${ip}`, (error, stdout, stderr) => {
      if (error || stderr) {
        resolve(null); // Resolve as null if nslookup fails
      } else {
        // Try to match the DNS name in the output
        const nameMatch = stdout.match(/Name:\s*(.*)/);
        if (nameMatch) {
          resolve(nameMatch[1].trim()); // Return the DNS name if found
        } else {
          resolve(null); // No name found
        }
      }
    });
  });
}

// Function to scan the local network and resolve hostnames using nslookup
async function scanNetwork() {
  const devices = await localDevices(); // Scan for devices
  const devicesWithNames = await Promise.all(devices.map(async (device) => {
    const name = await nslookup(device.ip);
    device.name = name || `Unknown Device (${device.mac})`; // Fallback to MAC if no name found
    console.log(device.name);

    return device;
  }));
  return devicesWithNames;
}

// API endpoint to scan the network and return devices with names
app.get('/scan', async (req, res) => {
  try {
    const devices = await scanNetwork();
    res.json(devices);
  } catch (error) {
    res.status(500).send('Error scanning network: ' + error.message);
  }
});

// Serve the front-end visualization
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(3000, () => {
  console.log('Network scanner running on http://localhost:3000');
});
