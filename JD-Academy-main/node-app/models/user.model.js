// Placeholder user model for future authentication and database mapping.

class User {
  constructor({ id, name, email, passwordHash }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.passwordHash = passwordHash;
  }
}

module.exports = User;
