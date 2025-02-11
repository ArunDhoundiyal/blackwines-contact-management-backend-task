## User Registration (POST):
https://blackwines-contact-management-backend-vmky.onrender.com/auth/register

## User Login (POST):
https://blackwines-contact-management-backend-vmky.onrender.com/auth/login 

## Create Contact (POST):
https://blackwines-contact-management-backend-vmky.onrender.com/contact

## Get All Contacts (GET):
https://blackwines-contact-management-backend-vmky.onrender.com/contact

## Get Single Contact by ID (GET):
https://blackwines-contact-management-backend-vmky.onrender.com/contact/:id

## Update Contact by ID (PUT):
https://blackwines-contact-management-backend-vmky.onrender.com/contact/:id

## Delete Contact by ID (DELETE):
https://blackwines-contact-management-backend-vmky.onrender.com/contact/:id

## Table Schema
## User Table
CREATE TABLE user(id TEXT NOT NULL PRIMARY KEY, name VARCHAR(150), email TEXT, password TEXT);
PRAGMA table_info(user);

0|id|TEXT|1||1
1|name|VARCHAR(150)|0||0
2|email|TEXT|0||0
3|password|TEXT|0||0

## Contact Table 
CREATE TABLE contact(id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT, phone_number TEXT, address TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, user_id TEXT, FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE);

0|id|INTEGER|1||1
1|name|TEXT|0||0
2|email|TEXT|0||0
3|phone_number|TEXT|0||0
4|address|TEXT|0||0
5|created_at|TIMESTAMP|0|CURRENT_TIMESTAMP|0
6|user_id|TEXT|0||0

## Both Tables are Interconnected through user_id of contact table that is a FOREIGN KEY of user table refer to the id
