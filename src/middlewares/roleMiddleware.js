function requireRole(role) {
  return (req, res, next) => {
    if (!res.locals.id) return res.status(401).json({ error: "Unauthenticated" });

    const userRole = res.locals.role;
    if (!userRole) return res.status(403).json({ error: "No role in token" });

    if (userRole !== role) return res.status(403).json({ error: "Forbidden" });

    next();
  };
}

module.exports = { requireRole };
