import { Component, inject } from '@angular/core';
import { Firestore, collection, addDoc } from '@angular/fire/firestore'; // Importamos Firebase

@Component({
  selector: 'app-register',
  standalone: true, // Asegúrate de que esto esté así
  imports: [],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  // Inyectamos el servicio de base de datos
  private firestore = inject(Firestore);

  // Función para probar si la conexión funciona
  async probarConexion() {
    try {
      const col = collection(this.firestore, 'test_tfg');
      await addDoc(col, { 
        mensaje: '¡Conectado desde el Register!',
        fecha: new Date().toISOString() 
      });
      alert('¡CONEXIÓN EXITOSA! Revisa tu consola de Firebase.');
    } catch (error) {
      console.error('Error al conectar:', error);
      alert('Fallo en la conexión. Mira la consola (F12).');
    }
  }
}