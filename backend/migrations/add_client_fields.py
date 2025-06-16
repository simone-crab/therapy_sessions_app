from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('clients', sa.Column('initial_assessment_date', sa.Date(), nullable=True))
    op.add_column('clients', sa.Column('address1', sa.String(255), nullable=True))
    op.add_column('clients', sa.Column('address2', sa.String(255), nullable=True))
    op.add_column('clients', sa.Column('city', sa.String(100), nullable=True))
    op.add_column('clients', sa.Column('postcode', sa.String(20), nullable=True))
    op.add_column('clients', sa.Column('emergency_contact_name', sa.String(100), nullable=True))
    op.add_column('clients', sa.Column('emergency_contact_relationship', sa.String(100), nullable=True))
    op.add_column('clients', sa.Column('emergency_contact_phone', sa.String(50), nullable=True))
    op.add_column('clients', sa.Column('gp_name', sa.String(100), nullable=True))
    op.add_column('clients', sa.Column('gp_practice', sa.String(255), nullable=True))
    op.add_column('clients', sa.Column('gp_phone', sa.String(50), nullable=True))

def downgrade():
    op.drop_column('clients', 'gp_phone')
    op.drop_column('clients', 'gp_practice')
    op.drop_column('clients', 'gp_name')
    op.drop_column('clients', 'emergency_contact_phone')
    op.drop_column('clients', 'emergency_contact_relationship')
    op.drop_column('clients', 'emergency_contact_name')
    op.drop_column('clients', 'postcode')
    op.drop_column('clients', 'city')
    op.drop_column('clients', 'address2')
    op.drop_column('clients', 'address1')
    op.drop_column('clients', 'initial_assessment_date') 