const express = require('express');
const {checkUserCredentials, checkLoginCredentials, checkContactEmailPhoneNumber} = require('./check-user-credentials');
const {v4:uuidv4} = require('uuid')
const jwt = require('jsonwebtoken');
const bcrypt = require("bcrypt");
const cors = require('cors');
const sqlite3 = require('sqlite3');
const {open} = require('sqlite');
const path = require('path');
const dbPath = path.join(__dirname, 'contact_managemnt.db');
let dataBase = null;
const serverInstance = express();
serverInstance.use(express.json());
serverInstance.use(express.urlencoded({ extended: true }));
serverInstance.use(cors());
const Port = process.env.PORT || 4000;

const initializeDatabaseSever = async() => {
    try {
        dataBase = await open({
            filename:dbPath,
            driver:sqlite3.Database
        })
        serverInstance.listen(Port, ()=>{
            console.log(`Server is running on the PORT:- http://localhost:${Port}`)
        })
        console.log('Database initialized:', dataBase)

        
    } catch (error) {
        console.log(`Database Error: ${error}`)
        process.exit(1);
    }
}
initializeDatabaseSever();

// Token Authorization (Middleware Function)
const authenticateToken  = (request, response, next) => {
    let jwtToken;
    const authHeaders = request.headers['authorization'];
    if (!authHeaders) return response.status(401).json({error:"Authorization header missing..!"});
    jwtToken = authHeaders.split(' ')[1];
    if (!jwtToken) return response.status(401).json({error:"Unauthorized Access Token..!"});
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async(error, payload)=>{
        if (error) return response.status(403).json({error:"Invalid Token"});
        request.email = payload.email
        next()
    })
}

// user registration 
serverInstance.post('/auth/register', async (request, response) => {
    try {
        const { userName, userEmail, userPassword } = request.body;
        console.log(userName, userEmail, userPassword);

        if (!userName || !userEmail || !userPassword) {
            return response.status(400).json({ error: 'All user details are mandatory..!' });
        }

        const { error } = checkUserCredentials.validate({
            user_name: userName,
            user_email: userEmail,
            user_password: userPassword
        });
        if (error) {
            return response.status(400).json({ error: error.details[0].message });
        }

        const checkUserExist = await dataBase.get('SELECT * FROM user WHERE email = ?', [userEmail]);
        if (checkUserExist) {
            return response.status(400).json({ error: `User ${checkUserExist.email} already exists..!` });
        }

        const hashedPassword = await bcrypt.hash(userPassword, 10);

        await dataBase.run(
            'INSERT INTO user(id, name, email, password) VALUES (?, ?, ?, ?)', 
            [uuidv4(), userName, userEmail, hashedPassword]
        );

        return response.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
});

// user login 
serverInstance.post('/auth/login', async(request, response)=>{
    const {userEmail, userPassword} = request.body;
    try {
        if (!userEmail || !userPassword){
            return response.status(400).json({error:'Valid user email and password both are mandatory..!'})
        }
    
        const {error} = checkLoginCredentials.validate({
            user_email:userEmail,
            user_password: userPassword
        })
        if (error){
            return response.status(400).json({ error: error.details[0].message });
        }
        const checkLoginUser = await dataBase.get('SELECT * FROM user WHERE email = ?', [userEmail]);
        if (!checkLoginUser){
            return response.status(400).json({error:'Invalid user login email..!'});
        } 

        const checkPassword = await bcrypt.compare(userPassword, checkLoginUser.password);
        if (checkPassword){
            const payload = {email: checkLoginUser.email};
            const jwtToken = jwt.sign(payload, 'MY_SECRET_TOKEN');
            response.status(200).json({jwt_token:jwtToken})
            console.log({jwt_token:jwtToken})
        }
        else{
            response.status(400).json({error:"Invalid user login password..!"})
        }
    
        
    } catch (error) {
        response.status(500).json({error:`Error while login: ${error.message}`})
    }

})


// POST /contacts 
serverInstance.post('/contact', authenticateToken, async(request, response)=>{
    const {contactName, contactEmail, contactNumber, contactAddress} = request.body
    const {email} = request
    try {
        if (!contactName || !contactEmail || !contactNumber || !contactAddress){
            return response.status(400).json({error:'All contact details are mandatory to give..!'})
        }
        const {error} = checkContactEmailPhoneNumber.validate({contact_email:contactEmail, contact_phonenumber:contactNumber});
        if (error){
            return response.status(400).json({ error: error.details[0].message });
        }
        const checkContactExist = await dataBase.get('SELECT * FROM contact WHERE email = ? OR phone_number = ?', [contactEmail, contactNumber]);
        if (checkContactExist){
            return response.status(400).json({error:'User already exist..!'})
        }
        else{
            const checkUser = await dataBase.get('SELECT * FROM user WHERE email = ?', [email]);
            if (!checkUser){
                return response.status(400).json({ error: "User not found" });
            }
            else{
                await dataBase.run('INSERT INTO contact(name, email, phone_number, address, user_id) VALUES(?,?,?,?,?)', [contactName, contactEmail, contactNumber, contactAddress, checkUser.id]);
                return response.status(201).json({message:'Contact created successfully'})
            }
        }
        
    } catch (error) {
        response.status(500).json({error:`Error while login: ${error.message}`})
    }

})

// PUT /contacts/:id 
serverInstance.put('/contact/:id', authenticateToken, async(request, response)=>{
    const {id} = request.params;
    try {
        const user = await dataBase.get('SELECT * FROM contact WHERE id = ?', [id]);
        if (!user){
            return response.status(404).json({error:`Invalid contact Id = ${id}`})
        }
        else{
            const {
                contactName=user.name, 
                contactEmail=user.email, 
                contactNumber=user.phone_number, 
                contactAddress=user.address
            } = request.body
            const {error} = checkContactEmailPhoneNumber.validate({contact_email:contactEmail, contact_phonenumber:contactNumber});
            if (error){
                return response.status(400).json({ error: error.details[0].message });
            }
            await dataBase.run('UPDATE contact SET name = ?, email = ?, phone_number = ?, address = ? WHERE id = ?', [contactName, contactEmail, contactNumber, contactAddress, id]);
            return response.status(200).json({message:'Contact updated successfully'})
        }
    } catch (error) {
        response.status(500).json({error:`Error while login: ${error.message}`})
    }
})

// DELETE /contacts/:id 
serverInstance.delete('/contact/:id', authenticateToken, async(request, response)=>{
    const {id} = request.params
    try {
        const checkContact = await dataBase.get('SELECT * FROM contact WHERE id = ?', [id]);
        if (!checkContact){
            return response.status(404).json({error:`Invalid contact Id = ${id}`})
        }
        else{
            await dataBase.run('DELETE FROM contact WHERE id = ?', [id]);
            return response.status(200).json({message:'Contact deleted successfully'})
        }
        
    } catch (error) {
        response.status(500).json({error:`Error while login: ${error.message}`});
    }
})

// GET /contacts/:id 
serverInstance.get('/contact/:id', authenticateToken, async(request, response)=>{
    const {id} = request.params
    try {
        const checkContact = await dataBase.get('SELECT * FROM contact WHERE id = ?', [id]);
        if (!checkContact){
            return response.status(404).json({error:`Invalid contact Id = ${id}, No data found..!`})
        }
        else{
            return response.status(400).json(checkContact)
        }
        
    } catch (error) {
        response.status(500).json({error:`Error while login: ${error.message}`});
    }
})


// GET /contacts 
serverInstance.get('/contact', authenticateToken, async(request, response)=>{
    const {name, email} = request.query;
    const conditions = [];
    const parameters = [];
    let query = `SELECT * FROM contact`
    try {
        if (name){
            conditions.push(`name = ?`);
            parameters.push(name);

        } 
        if (email){
            conditions.push(`email = ?`);
            parameters.push(email);
        }
        if (conditions.length > 0){
            query += ` WHERE `+ conditions.join(' AND ');
        }

        const getAllContact = await dataBase.all(query, parameters)
        if (getAllContact.length === 0){
            response.status(400).json('No contact data found..!')
        }
        else{
            response.status(200).json(getAllContact)
        }

    } catch (error) {
        response.status(500).json({error:`Error: ${error.message}`})
    }
})