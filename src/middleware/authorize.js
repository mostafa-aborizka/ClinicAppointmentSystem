function authorize(...roles) {
  if (roles.length === 0) {
    throw new Error("At least one role must be specified");
  }
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "Not authorized",
      });
    }
    next();
  };
}
export default authorize;
