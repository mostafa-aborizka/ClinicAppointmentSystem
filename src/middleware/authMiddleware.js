import jwt from "jsonwebtoken";
const roles = ["PATIENT", "DOCTOR", "RECEPTIONIST", "ADMIN"];

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required",
    });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (
      err ||
      !decoded.sub ||
      !decoded.role ||
      !/^\d+$/.test(decoded.sub) ||
      Number(decoded.sub) <= 0 ||
      !roles.includes(decoded.role)
    ) {
      return res.status(401).json({
        status: "error",
        message: "Invalid token",
      });
    }

    req.user = {
      id: Number(decoded.sub),
      role: decoded.role,
    };
    next();
  });
}

export default authMiddleware;
