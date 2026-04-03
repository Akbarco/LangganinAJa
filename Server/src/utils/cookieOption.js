const cookieOptions = (req) => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction && req.hostname !== "localhost",
    sameSite: "strict",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000, // 1 hari
  };
};

export default cookieOptions;
