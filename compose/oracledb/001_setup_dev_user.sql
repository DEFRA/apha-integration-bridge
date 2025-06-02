-- Connect to the default pluggable database
ALTER SESSION SET CONTAINER=FREEPDB1;

-- Create schema/user 'sam' and grant DBA privileges
CREATE USER sam IDENTIFIED BY "password";
GRANT CONNECT, RESOURCE, DBA TO sam;

-- Create schema/user 'pega' and grant DBA privileges
CREATE USER pega IDENTIFIED BY "password";
GRANT CONNECT, RESOURCE, DBA TO pega;