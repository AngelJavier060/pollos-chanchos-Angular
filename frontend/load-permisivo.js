console.log('Ignorando errores de TypeScript para desarrollo...'); 
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ 
  skipLibCheck: true, 
  strict: false, 
  noImplicitAny: false 
}); 
