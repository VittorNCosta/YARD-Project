const app = require("./app");
const connectDB = require("./config/database");

const PORT = 3000;

connectDB();

app.listen(PORT, () => {
  console.log(`🚛 YARD API rodando na porta ${PORT}`);
});
