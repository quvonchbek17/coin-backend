import { MongooseModule } from "@nestjs/mongoose";
import { Users, usersSchema } from "./schemas";

const schemas = [
    MongooseModule.forFeature([
        {name: Users.name, schema: usersSchema},
    ])
]

export default schemas