"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
require("./globals.css");
exports.metadata = {
    title: "SolarSync",
    description: "Monitoramento energético residencial",
};
function RootLayout({ children, }) {
    return (<html lang="pt-BR">
      <body>{children}</body>
    </html>);
}
//# sourceMappingURL=layout.js.map