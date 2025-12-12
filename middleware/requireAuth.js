import jwt from 'jsonwebtoken';

export default function requireAuth(req, res, next){
    if(!req.session.user){
        return res.redirect('/login');
    }
const token = req.session.user.token;
if (!token) {
    return res.redirect("/login");
  }

try{
    jwt.verify(token, process.env.JWT_SECRET);
   return  next();
}catch(err){
    return res.redirect("/login");
}
}