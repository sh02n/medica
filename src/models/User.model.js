const prisma = require('./prismaClient');

// LOGIN (same flow as Student model)
module.exports.login = async function login(req, res, next) {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // bcryptMiddleware.comparePassword uses res.locals.passwordHash
    res.locals.passwordHash = user.password;

    // your JWT generateToken uses res.locals.username + id
    // keep "username" name to avoid changing jwtMiddleware / frontend too much
    res.locals.username = user.email;
    res.locals.id = user.id;

    // ✅ IMPORTANT: add role so token can include it
    res.locals.role = user.role;

    next();
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// REGISTER
module.exports.register = async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;

    // Check if email exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return res.status(400).json({ message: 'Email is already in use' });
    }

    const hashedPassword = res.locals.hash;

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'CSA', // default CSA if not provided
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      }
    });

    return res.status(201).json({ message: 'User registered successfully!', user: newUser });
  } catch (error) {
    console.error('Error registering user:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Email is already in use' });
    }

    return res.status(500).json({ message: 'Internal server error' });
  }
};
