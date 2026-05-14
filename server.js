const express = require('express');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(express.json());

const limiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 100,
    message: { error: 'Слишком много запросов, попробуйте позже' }
});
app.use('/api/', limiter);

let products = [
    { id: 1, name: 'Chanel No.5', price: 12000, category_id: 1, volume_ml: 100, in_stock: true },
    { id: 2, name: 'Dior Sauvage', price: 8900, category_id: 2, volume_ml: 100, in_stock: true },
    { id: 3, name: 'Tom Ford Black Orchid', price: 15000, category_id: 3, volume_ml: 50, in_stock: false }
];

let categories = [
    { id: 1, name: 'Женские', description: 'Женская парфюмерия' },
    { id: 2, name: 'Мужские', description: 'Мужская парфюмерия' },
    { id: 3, name: 'Унисекс', description: 'Универсальная парфюмерия' }
];

let users = [
    { id: 1, email: 'admin@perfume.com', password: 'admin123', username: 'admin', role: 'admin' },
    { id: 2, email: 'user@perfume.com', password: 'user123', username: 'user', role: 'user' }
];

let orders = [
    { id: 1, user_id: 2, items: [{ product_id: 1, quantity: 1 }], total_price: 12000, status: 'completed', address: 'Москва, ул. Тверская, д.5', created_at: '2026-03-20T10:00:00Z' }
];

let reviews = [
    { id: 1, product_id: 1, user_id: 2, rating: 5, comment: 'Великолепный аромат!', created_at: '2026-03-19T10:00:00Z' }
];

let activeTokens = [];

function findUserByEmail(email) {
    for (var i = 0; i < users.length; i++) {
        if (users[i].email === email) {
            return users[i];
        }
    }
    return null;
}

function generateToken(userId) {
    var token = 'token_' + userId + '_' + Date.now();
    activeTokens.push({ token: token, user_id: userId, expires: Date.now() + 86400000 });
    return token;
}

function verifyToken(token) {
    for (var i = 0; i < activeTokens.length; i++) {
        if (activeTokens[i].token === token && activeTokens[i].expires > Date.now()) {
            return activeTokens[i].user_id;
        }
    }
    return null;
}

function getUserById(userId) {
    for (var i = 0; i < users.length; i++) {
        if (users[i].id === userId) {
            return users[i];
        }
    }
    return null;
}

app.post('/api/register', function(req, res) {
    var email = req.body.email;
    var password = req.body.password;
    var username = req.body.username;

    if (!email ||  !password ||  !username) {
        return res.status(400).json({ error: 'Обязательные поля: email, password, username' });
    }

    var existingUser = findUserByEmail(email);
    if (existingUser) {
        return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
    }

    var newUser = {
        id: users.length + 1,
        email: email,
        password: password,
        username: username,
        role: 'user'
    };

    users.push(newUser);

    var token = generateToken(newUser.id);

    res.status(201).json({
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        token: token
    });
});

app.post('/api/login', function(req, res) {
    var email = req.body.email;
    var password = req.body.password;

    if (!email || !password) {
        return res.status(400).json({ error: 'Обязательные поля: email, password' });
    }

    var user = findUserByEmail(email);

    if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    var token = generateToken(user.id);

    res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        token: token
    });
});

app.post('/api/logout', function(req, res) {
    var token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    for (var i = 0; i < activeTokens.length; i++) {
        if (activeTokens[i].token === token) {
            activeTokens.splice(i, 1);
            break;
        }
    }
    res.json({ message: 'Выход выполнен успешно' });
});

app.get('/api/products', function(req, res) {
    var result = [];
    for (var i = 0; i < products.length; i++) {
        var product = products[i];
        var category = null;
        for (var j = 0; j < categories.length; j++) {
            if (categories[j].id === product.category_id) {
                category = categories[j].name;
                break;
            }
        }
        result.push({
            id: product.id,
            name: product.name,
            price: product.price,
            category: category,
            volume_ml: product.volume_ml,
            in_stock: product.in_stock
        });
    }
    res.json(result);
});

app.get('/api/products/:id', function(req, res) {
    var id = parseInt(req.params.id);
    var product = null;

    for (var i = 0; i < products.length; i++) {
        if (products[i].id === id) {
            product = products[i];
            break;
        }
    }

    if (!product) {
        return res.status(404).json({ error: 'Товар не найден' });
    }

    var categoryName = null;
    for (var j = 0; j < categories.length; j++) {
        if (categories[j].id === product.category_id) {
            categoryName = categories[j].name;
            break;
        }
    }

    res.json({
        id: product.id,
        name: product.name,
        price: product.price,
        category: categoryName,
        volume_ml: product.volume_ml,
        in_stock: product.in_stock
    });
});

app.post('/api/products', function(req, res) {
    var token = req.headers['authorization'];
    
    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    var userId = verifyToken(token);
    if (!userId) {
        return res.status(401).json({ error: 'Недействительный токен' });
    }

    var user = getUserById(userId);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещён. Требуются права администратора' });
    }

    var name = req.body.name;
    var price = req.body.price;
    var categoryName = req.body.category;
    var volume_ml = req.body.volume_ml || 100;
    var in_stock = (req.body.in_stock !== undefined) ? req.body.in_stock : true;

    if (!name || !price || !categoryName) {
        return res.status(400).json({ error: 'Обязательные поля: name, price, category' });
    }

    var categoryId = null;
    for (var i = 0; i < categories.length; i++) {
        if (categories[i].name === categoryName) {
            categoryId = categories[i].id;
            break;
        }
    }

    if (!categoryId) {
        return res.status(400).json({ error: 'Категория не найдена. Доступные: Женские, Мужские, Унисекс' });
    }

    var newProduct = {
        id: products.length + 1,
        name: name,
        price: price,
        category_id: categoryId,
        volume_ml: volume_ml,
        in_stock: in_stock
    };

    products.push(newProduct);
    res.status(201).json(newProduct);
});

app.delete('/api/products/:id', function(req, res) {
    var token = req.headers['authorization'];
    
    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    var userId = verifyToken(token);
    if (!userId) {
        return res.status(401).json({ error: 'Недействительный токен' });
    }

    var user = getUserById(userId);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещён. Требуются права администратора' });
    }

    var id = parseInt(req.params.id);
    var index = -1;

    for (var i = 0; i < products.length; i++) {
        if (products[i].id === id) {
            index = i;
            break;
        }
    }

    if (index === -1) {
        return res.status(404).json({ error: 'Товар не найден' });
    }

    products.splice(index, 1);
    res.json({ message: 'Товар удалён' });
});

app.get('/api/categories', function(req, res) {
    res.json(categories);
});
app.get('/api/categories/:id/products', function(req, res) {
    var categoryId = parseInt(req.params.id);
    
    var result = [];
    for (var i = 0; i < products.length; i++) {
        if (products[i].category_id === categoryId) {
            result.push(products[i]);
        }
    }
    
    res.json(result);
});

app.post('/api/orders', function(req, res) {
    var token = req.headers['authorization'];
    
    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    var userId = verifyToken(token);
    if (!userId) {
        return res.status(401).json({ error: 'Недействительный токен' });
    }

    var items = req.body.items;
    var address = req.body.address;

    if (!items || !address ||  items.length === 0) {
        return res.status(400).json({ error: 'Обязательные поля: items, address' });
    }

    var total_price = 0;
    for (var i = 0; i < items.length; i++) {
        var productId = items[i].product_id;
        var quantity = items[i].quantity;
        
        var product = null;
        for (var j = 0; j < products.length; j++) {
            if (products[j].id === productId) {
                product = products[j];
                break;
            }
        }
        
        if (!product) {
            return res.status(400).json({ error: 'Товар с ID ' + productId + ' не найден' });
        }
        
        if (!product.in_stock) {
            return res.status(400).json({ error: 'Товар "' + product.name + '" отсутствует на складе' });
        }
        
        total_price = total_price + (product.price * quantity);
    }

    var newOrder = {
        id: orders.length + 1,
        user_id: userId,
        items: items,
        total_price: total_price,
        status: 'new',
        address: address,
        created_at: new Date().toISOString()
    };

    orders.push(newOrder);
    res.status(201).json(newOrder);
});

app.get('/api/orders/:id', function(req, res) {
    var token = req.headers['authorization'];
    
    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    var userId = verifyToken(token);
    if (!userId) {
        return res.status(401).json({ error: 'Недействительный токен' });
    }

    var orderId = parseInt(req.params.id);
    var order = null;
    
    for (var i = 0; i < orders.length; i++) {
        if (orders[i].id === orderId) {
            order = orders[i];
            break;
        }
    }
    
    if (!order) {
        return res.status(404).json({ error: 'Заказ не найден' });
    }
    
    var user = getUserById(userId);
    if (order.user_id !== userId && user.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещён' });
    }
    
    res.json(order);
});

app.put('/api/orders/:id/status', function(req, res) {
    var token = req.headers['authorization'];
    
    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    var userId = verifyToken(token);
    if (!userId) {
        return res.status(401).json({ error: 'Недействительный токен' });
    }

    var user = getUserById(userId);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещён. Требуются права администратора' });
    }

    var orderId = parseInt(req.params.id);
    var newStatus = req.body.status;
    
    if (!newStatus) {
        return res.status(400).json({ error: 'Обязательное поле: status' });
    }
    
    var allowedStatuses = ['new', 'processing', 'shipped', 'delivered', 'cancelled'];
    var isValid = false;
    for (var i = 0; i < allowedStatuses.length; i++) {
        if (allowedStatuses[i] === newStatus) {
            isValid = true;
            break;
        }
    }
    
    if (!isValid) {
        return res.status(400).json({ error: 'Недопустимый статус. Доступные: new, processing, shipped, delivered, cancelled' });
    }
    var order = null;
    var orderIndex = -1;
    for (var i = 0; i < orders.length; i++) {
        if (orders[i].id === orderId) {
            order = orders[i];
            orderIndex = i;
            break;
        }
    }
    if (!order) {
        return res.status(404).json({ error: 'Заказ не найден' });
    }
    
    orders[orderIndex].status = newStatus;
    res.json({ message: 'Статус заказа обновлён', status: newStatus });
});

app.post('/api/products/:id/reviews', function(req, res) {
    var token = req.headers['authorization'];
    
    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    var userId = verifyToken(token);
    if (!userId) {
        return res.status(401).json({ error: 'Недействительный токен' });
    }

    var productId = parseInt(req.params.id);
    var rating = req.body.rating;
    var comment = req.body.comment;
    
    var productExists = false;
    for (var i = 0; i < products.length; i++) {
        if (products[i].id === productId) {
            productExists = true;
            break;
        }
    }
    
    if (!productExists) {
        return res.status(404).json({ error: 'Товар не найден' });
    }
    if (!rating ||  rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Обязательное поле rating от 1 до 5' });
    }
    
    var newReview = {
        id: reviews.length + 1,
        product_id: productId,
        user_id: userId,
        rating: rating,
        comment: comment || '',
        created_at: new Date().toISOString()
    };
    
    reviews.push(newReview);
    res.status(201).json(newReview);
});

app.get('/api/products/:id/reviews', function(req, res) {
    var productId = parseInt(req.params.id);
    
    var result = [];
    for (var i = 0; i < reviews.length; i++) {
        if (reviews[i].product_id === productId) {
            var user = getUserById(reviews[i].user_id);
            result.push({
                id: reviews[i].id,
                username: user ? user.username : 'unknown',
                rating: reviews[i].rating,
                comment: reviews[i].comment,
                created_at: reviews[i].created_at
            });
        }
    }
    
    res.json(result);
});

app.get('/api/users/me', function(req, res) {
    var token = req.headers['authorization'];
    
    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    var userId = verifyToken(token);
    if (!userId) {
        return res.status(401).json({ error: 'Недействительный токен' });
    }
    
    var user = getUserById(userId);
    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
    });
});

var PORT = 3000;
app.listen(PORT, function() {
    console.log('Сервер запущен на http://localhost:' + PORT);
});