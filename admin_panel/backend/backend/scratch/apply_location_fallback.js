const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../routes/partner.js');
let code = fs.readFileSync(filePath, 'utf8');

// Helper to normalize newlines
const norm = (s) => s.replace(/\r\n/g, '\n');
code = norm(code);

// Replacement 1: nearbyV2 in /bookings
const target1 = `  function nearbyV2(o) {
    const a = parseAddrV2(o);
    const oLa = parseFloat(a.latitude), oLo = parseFloat(a.longitude);
    if (hasCoords && !isNaN(oLa) && !isNaN(oLo)) return distKm(partnerLat,partnerLon,oLa,oLo)<=RADIUS_KM;`;

const replacement1 = `  function nearbyV2(o) {
    const a = parseAddrV2(o);
    const oLa = parseFloat(a.latitude), oLo = parseFloat(a.longitude);
    if (hasCoords && !isNaN(oLa) && !isNaN(oLo)) {
      const distance = distKm(partnerLat, partnerLon, oLa, oLo);
      if (distance <= RADIUS_KM) return true;
      if (distance > 1000) {
        return ((a.city||'').toLowerCase()).includes((req.partner.city||'').toLowerCase()) ||
               ((req.partner.city||'').toLowerCase()).includes((a.city||'').toLowerCase());
      }
      return false;
    }`;

// Replacement 2: nearbyAdmin in /bookings
const target2 = `  function nearbyAdmin(o) {
    const oLa = parseFloat(o.latitude), oLo = parseFloat(o.longitude);
    if (hasCoords && !isNaN(oLa) && !isNaN(oLo)) return distKm(partnerLat,partnerLon,oLa,oLo)<=RADIUS_KM;`;

const replacement2 = `  function nearbyAdmin(o) {
    const oLa = parseFloat(o.latitude), oLo = parseFloat(o.longitude);
    if (hasCoords && !isNaN(oLa) && !isNaN(oLo)) {
      const distance = distKm(partnerLat, partnerLon, oLa, oLo);
      if (distance <= RADIUS_KM) return true;
      if (distance > 1000) {
        return ((o.city||'').toLowerCase()).includes((req.partner.city||'').toLowerCase()) ||
               ((o.city||'').toLowerCase()).includes((o.city||'').toLowerCase());
      }
      return false;
    }`;

// Replacement 3: nearbyV2 in /partner/dashboard
const target3 = `    function nearbyV2(o) {
      const a = parseAddrV2(o);
      const oLa = parseFloat(a.latitude), oLo = parseFloat(a.longitude);
      if (hasCoords && !isNaN(oLa) && !isNaN(oLo)) return distKm(partnerLat,partnerLon,oLa,oLo)<=RADIUS_KM;`;

const replacement3 = `    function nearbyV2(o) {
      const a = parseAddrV2(o);
      const oLa = parseFloat(a.latitude), oLo = parseFloat(a.longitude);
      if (hasCoords && !isNaN(oLa) && !isNaN(oLo)) {
        const distance = distKm(partnerLat, partnerLon, oLa, oLo);
        if (distance <= RADIUS_KM) return true;
        if (distance > 1000) {
          return ((a.city||'').toLowerCase()).includes((req.partner.city||'').toLowerCase()) ||
                 ((req.partner.city||'').toLowerCase()).includes((a.city||'').toLowerCase());
        }
        return false;
      }`;

// Replacement 4: nearbyAdmin in /partner/dashboard
const target4 = `    function nearbyAdmin(o) {
      const oLa = parseFloat(o.latitude), oLo = parseFloat(o.longitude);
      if (hasCoords && !isNaN(oLa) && !isNaN(oLo)) return distKm(partnerLat,partnerLon,oLa,oLo)<=RADIUS_KM;`;

const replacement4 = `    function nearbyAdmin(o) {
      const oLa = parseFloat(o.latitude), oLo = parseFloat(o.longitude);
      if (hasCoords && !isNaN(oLa) && !isNaN(oLo)) {
        const distance = distKm(partnerLat, partnerLon, oLa, oLo);
        if (distance <= RADIUS_KM) return true;
        if (distance > 1000) {
          return ((o.city||'').toLowerCase()).includes((req.partner.city||'').toLowerCase()) ||
                 ((o.city||'').toLowerCase()).includes((o.city||'').toLowerCase());
        }
        return false;
      }`;

if (!code.includes(target1)) { console.error("target1 not found"); process.exit(1); }
if (!code.includes(target2)) { console.error("target2 not found"); process.exit(1); }
if (!code.includes(target3)) { console.error("target3 not found"); process.exit(1); }
if (!code.includes(target4)) { console.error("target4 not found"); process.exit(1); }

code = code.replace(target1, replacement1);
code = code.replace(target2, replacement2);
code = code.replace(target3, replacement3);
code = code.replace(target4, replacement4);

fs.writeFileSync(filePath, code, 'utf8');
console.log("Successfully replaced all 4 nearby functions!");
process.exit(0);
