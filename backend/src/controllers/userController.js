async function getMe(req, res, next) {
  try {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        plan: req.user.plan,
        createdAt: req.user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe };
