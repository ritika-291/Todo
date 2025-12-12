import jwt from 'jsonwebtoken';

export function createAcessToken(user){
      if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is missing in .env");
    }
    return jwt.sign(
        {email:user.email, username:user.username},
        process.env.JWT_SECRET,
        {expiresIn:"15m"}
    )
}