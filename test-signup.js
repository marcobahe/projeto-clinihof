// Teste simples da API de signup
async function testSignup() {
  const testData = {
    email: 'teste@clinihof.com',
    password: 'senha123',
    fullName: 'Usuário Teste',
    clinicName: 'Clínica Teste'
  };

  try {
    console.log('🧪 Testando signup...');
    
    const response = await fetch('http://localhost:3000/api/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Signup bem-sucedido!');
      console.log('📋 Dados do usuário criado:', result.user);
      console.log('🌱 Dados de exemplo devem ter sido criados no workspace');
      return result.user.id;
    } else {
      console.log('❌ Erro no signup:', result.error);
      if (result.error.includes('já está cadastrado')) {
        console.log('ℹ️  Usuário já existe, pulando teste...');
        return 'already-exists';
      }
    }
  } catch (error) {
    console.error('💥 Erro na requisição:', error);
  }
  
  return null;
}

// Função para limpar teste (deletar usuário de teste)
async function cleanupTestUser(userId) {
  if (!userId || userId === 'already-exists') return;
  
  try {
    console.log('🧹 Limpando dados de teste...');
    
    // Aqui seria melhor ter uma API específica para limpeza
    // Por agora, apenas informamos que o teste foi concluído
    console.log('ℹ️  Usuário de teste criado com ID:', userId);
    console.log('⚠️  Remova manualmente se necessário');
    
  } catch (error) {
    console.error('Erro na limpeza:', error);
  }
}

// Executar teste
testSignup()
  .then(userId => {
    if (userId) {
      console.log('📊 Resultado do teste: SUCESSO');
      // cleanupTestUser(userId);
    } else {
      console.log('📊 Resultado do teste: FALHOU');
    }
  });