exports.up = async function(knex) {
  await knex.schema.table('users', function(table) {
    table.decimal('default_income', 10, 2).notNullable().defaultTo(0);
  });
};

exports.down = async function(knex) {
  await knex.schema.table('users', function(table) {
    table.dropColumn('default_income');
  });
};
