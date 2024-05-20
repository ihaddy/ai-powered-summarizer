import { Request as ExpressRequest } from 'express';



export interface Request extends ExpressRequest {
    user: any; // Define the user property
    body: any; // Define the body property
    params: any; // Define the params property
    query: any; // Define the query property
}
