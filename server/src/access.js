export function apiAccess(pool, requireAuth) {
  return (req, res, next) => {
    const path = req.path.replace(/\/+$/, '') || '/';
    const read = req.method === 'GET' || req.method === 'HEAD';
    if ((path === '/auth/login' && req.method === 'POST') || (read && (path === '/public/resources' || path === '/health' || path === '/pages' || /^\/pages\/[^/]+\/sections$/.test(path)))) return next();
    requireAuth(req, res, async () => {
      try {
        const [rows] = await pool.query('SELECT userTypeId FROM User WHERE userId = ?', [req.authUserId]);
        const role = Number(rows[0]?.userTypeId);
        if (!rows.length) return res.status(401).json({message:'Please sign in again.'});
        const resourceWrite = !read && /^\/resources(\/|$)/.test(path);
        const restricted = /^\/(users|user-types|pages|sections|page-section-images)(\/|$)/.test(path);
        if (role !== 1 && (role !== 2 || restricted || resourceWrite)) return res.status(403).json({message:'You do not have access to this feature.'});
        next();
      } catch (error) { next(error); }
    });
  };
}
