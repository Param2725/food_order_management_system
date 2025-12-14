# Data Sharing Guide

This guide explains how to share your MongoDB data with another person using the provided scripts.

## Prerequisites

- Node.js installed on both machines.
- MongoDB installed and running (or a cloud MongoDB URI).
- This project code available on both machines.

## 1. Sender Instructions (You)

1.  **Open a terminal** and navigate to the `server` directory:
    ```bash
    cd server
    ```
    *(If you are already in `d:\order1`, type `cd server`)*
2.  **Install dependencies** (if not done):
    ```bash
    npm install
    ```
3.  **Run the export script**:
    ```bash
    node exportData.js
    ```
4.  **Locate the file**:
    - A file named `database_export.json` will be created in this `server` folder.
5.  **Send the file**:
    - Send this `database_export.json` file to the recipient.

## 2. Recipient Instructions (The other person)

1.  **Prepare the project**:
    - Open a terminal and navigate to the `server` directory.
    - Run `npm install` to install dependencies.
2.  **Configure Environment**:
    - Ensure a `.env` file exists in the `server` directory with the MongoDB connection string.
3.  **Place the file**:
    - Place the received `database_export.json` file into the `server` directory.
4.  **Run the import script**:
    - In the terminal (inside `server` directory), run:
      ```bash
      node importData.js
      ```
    - **Warning**: This will **CLEAR** their existing database data for these collections and replace it with the data from the JSON file.
5.  **Verify**:
    - Check the database to ensure the data has been imported correctly.
