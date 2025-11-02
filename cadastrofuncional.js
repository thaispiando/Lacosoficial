// ====== IMPORTS FIREBASE ======
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// ====== CONFIGURAÇÃO DO FIREBASE ======
const firebaseConfig = {
  apiKey: "AIzaSyBFspeEITyz0L6gmBWgZISlTJU_FDN7H7s",
  authDomain: "lacoscuidamais.firebaseapp.com",
  projectId: "lacoscuidamais",
  storageBucket: "lacoscuidamais.firebasestorage.app",
  messagingSenderId: "756414982825",
  appId: "1:756414982825:web:871b30376c9196c80d97b8",
  measurementId: "G-0YG12ZBFGY"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ====== FUNÇÕES DE VALIDAÇÃO ======
function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function validarSenha(senha) {
  return senha.length >= 6;
}
function validarCPF(cpf) {
  return /^\d{11}$/.test(cpf.replace(/\D/g, ""));
}
function validarTelefone(tel) {
  const s = tel.replace(/\D/g, "");
  return s.length === 10 || s.length === 11;
}
function validarArquivoCertificado(file) {
  if (!file) return { ok: false, reason: 'Nenhum arquivo selecionado.' };
  const allowed = ['application/pdf','image/jpeg','image/png'];
  if (!allowed.includes(file.type)) return { ok: false, reason: 'Formato inválido. Use PDF, JPG ou PNG.' };
  if (file.size > 5 * 1024 * 1024) return { ok: false, reason: 'Arquivo muito grande. Máx. 5 MB.' };
  return { ok: true };
}

// ====== MOSTRAR MENSAGEM DE ERRO OU SUCESSO ======
function setError(id, message) {
  const field = document.getElementById(id);
  let msgEl = field.nextElementSibling;
  if (!msgEl || !msgEl.classList.contains('error')) {
    msgEl = document.createElement('div');
    msgEl.classList.add('error');
    field.insertAdjacentElement('afterend', msgEl);
  }
  msgEl.textContent = message || '';
}

function clearErrors() {
  document.querySelectorAll('.error').forEach(el => el.textContent = '');
}

function showSuccessMessage() {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.background = 'rgba(0,0,0,0.6)';
  overlay.style.zIndex = '9999';
  overlay.innerHTML = `
    <div style="background: #fff; padding: 40px; border-radius: 12px; text-align:center; max-width: 350px;">
      <h2 style="color:#065f46; margin-bottom:10px;">Cadastro realizado com sucesso!</h2>
      <p style="color:#333;">Redirecionando...</p>
    </div>
  `;
  document.body.appendChild(overlay);
}

// ====== VIA CEP ======
async function buscarCEP(cepRaw) {
  const cep = cepRaw.replace(/\D/g, '');
  if (cep.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}

// ====== COMPORTAMENTO DO FORMULÁRIO ======
document.addEventListener('DOMContentLoaded', function() {
  const select = document.getElementById('user-type-select');
  const stepCuidador = document.getElementById('step-2-dados-cuidador');
  const submitBtn = document.getElementById('final-submit-btn');

  function toggleCuidadorFields() {
    const isCuidador = select.value === 'cuidador';
    stepCuidador.style.display = isCuidador ? 'block' : 'none';
    submitBtn.textContent = isCuidador ? 'Submeter para Aprovação' : 'Concluir Cadastro';
  }

  select.addEventListener('change', toggleCuidadorFields);
  toggleCuidadorFields();

  submitBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    clearErrors();

    // ====== PEGAR VALORES ======
    const tipo = select.value;
    const nome = document.getElementById('nome').value.trim();
    const cpf = document.getElementById('cpf').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value.trim();
    const cep = document.getElementById('cep').value.trim();
    const rua = document.getElementById('rua').value.trim();
    const numero = document.getElementById('numero').value.trim();
    const complemento = document.getElementById('complemento').value.trim();
    const bairroCidade = document.getElementById('bairroCidade').value.trim();
    const codigoIndicacao = document.getElementById('codigoIndicacao')?.value.trim() || '';
    const certificadoFile = document.getElementById('certificado')?.files[0];

    let erro = false;

    if (!validarCPF(cpf)) { setError('cpf', 'CPF inválido.'); erro = true; }
    if (!validarTelefone(telefone)) { setError('telefone', 'Telefone inválido.'); erro = true; }
    if (!validarEmail(email)) { setError('email', 'E-mail inválido.'); erro = true; }
    if (!validarSenha(senha)) { setError('senha', 'Senha precisa ter no mínimo 6 caracteres.'); erro = true; }

    if (!nome || !cep || !rua || !numero || !bairroCidade) {
      setError('nome', 'Preencha todos os campos obrigatórios.');
      erro = true;
    }
    if (erro) return;

    if (tipo === 'cuidador' && certificadoFile) {
      const res = validarArquivoCertificado(certificadoFile);
      if (!res.ok) { setError('certificado', res.reason); return; }
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, senha);
      const uid = cred.user.uid;

      let certificadoURL = '';
      if (tipo === 'cuidador' && certificadoFile) {
        const storageReference = storageRef(storage, `certificados/${uid}_${certificadoFile.name}`);
        await uploadBytes(storageReference, certificadoFile);
        certificadoURL = await getDownloadURL(storageReference);
      }

      await setDoc(doc(db, 'usuarios', uid), {
        tipo, nome, cpf, telefone, email,
        endereco: { cep, rua, numero, complemento, bairroCidade },
        codigoIndicacao: tipo === 'cuidador' ? codigoIndicacao : '',
        certificado: certificadoURL,
        criadoEm: serverTimestamp()
      });

      showSuccessMessage();
      setTimeout(() => {
        if (tipo === 'cliente') window.location.href = 'home_cliente.html';
        else window.location.href = 'dashboard_cuidador.html';
      }, 2500);

    } catch (err) {
      console.error(err);
      setError('email', 'Erro ao cadastrar: ' + err.message);
    }
  });

  // ====== VIA CEP ======
  const cepInput = document.getElementById('cep');
  cepInput.addEventListener('blur', async () => {
    const data = await buscarCEP(cepInput.value);
    if (data) {
      document.getElementById('rua').value = data.logradouro || '';
      document.getElementById('bairroCidade').value = `${data.bairro || ''} / ${data.localidade || ''}${data.uf ? ' - ' + data.uf : ''}`;
    }
  });
});
