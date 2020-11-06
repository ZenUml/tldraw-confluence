import styled from 'styled-components';

export const Card = styled.div`
  position: relative;
  text-decoration: none;
  background: rgb(255, 255, 255);
  box-shadow: rgba(9, 30, 66, 0.1) 0px 1px 1px, rgba(9, 30, 66, 0.31) 0px 0px 1px;
  border-radius: 4px;
  margin: 4px 1px;
  height: calc(100vh - 10px);
  box-sizing: border-box;
`;

export const Status = styled.span`
  float: right;
  align-items: center;
  display: inline-flex;
  margin-top: -24px;

  & > span {
    margin-left: 8px;
  }
`;

export const Form = styled.form`
  padding: 8px 0;
`;

export const LoadingContainer = styled.div`
  justify-content: center;
  display: flex;
  align-items: center;
  height: 100%;
`;

export const Row = styled.div`
  transition: .3s ease all;
  padding: 8px;
  border-bottom: 1px solid #efefef;

  button {
    opacity: 0;
    transition: .2s ease all;
    margin-left: 8px;
  }

  &:hover {
    button {
      opacity: 1;
    }
  }

  ${props => `
    ${props.isChecked ? 'text-decoration: line-through;' : ''}
    ${props.isCompact ? 'padding: 0 6px;' : ''}
    ${props.isCompact ? 'border: 0;' : ''}
  `}
`;

export const IconContainer = styled.span`
  position: relative;
  height: 20px;
  width: 24px;
  align-self: center;
  display: inline-flex;
  flex-wrap: nowrap;
  max-width: 100%;
  position: relative;
`;

export const Icon = styled.span`
  position: absolute;
`;

export const ScrollContainer = styled.div`
  overflow: auto;
  max-height: calc(100% - 40px);
`;

export const SummaryFooter = styled.div`
  width: 100%;
  height: 40px;
  bottom: 0;
  left: 0;
  position: absolute;
  background: #f7f7f7;
  border-top: 1px solid #eaeaea;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const SummaryCount = styled.div`
  padding: 0 12px;
`;

export const SummaryActions = styled.div`
  padding: 8px;
`;
