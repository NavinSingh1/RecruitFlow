// Strips keys beginning with "$" or containing "." to block NoSQL operator injection.
const clean = (o) => {
  if (Array.isArray(o)) return o.forEach(clean);
  if (o && typeof o === 'object') {
    for (const k of Object.keys(o)) {
      if (k.startsWith('$') || k.includes('.')) delete o[k];
      else clean(o[k]);
    }
  }
};
module.exports = (req, res, next) => { clean(req.body); clean(req.query); clean(req.params); next(); };
