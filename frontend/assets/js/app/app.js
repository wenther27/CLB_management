// App.js
import React, { useState, useEffect } from 'react';

function App() {
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: ''
  });

  const API_URL = 'http://localhost:5190/api/products';

  
}

export default App;